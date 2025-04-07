import os

def sanitize_js_identifier(name: str) -> str:
    """ Удаляет дефисы из имени конфигурации для корректного использования в JS. """
    return name.replace("-", "")

def generate_sw_js(generation_properties):
    target_path = generation_properties.target_root_path
    os.makedirs(target_path, exist_ok=True)
    sw_file_path = os.path.join(target_path, "sw.js")
    
    imports = []
    run_functions_map = []
    root_mappings_map = []
    
    for config_name, wasm_properties in generation_properties.configs.items():
        sanitized_name = sanitize_js_identifier(config_name)
        module_name = sanitized_name.capitalize() + "Module"
        imports.append(f"import * as {module_name} from './{config_name}/{config_name}.js';")
        run_functions_map.append(f"    ['{config_name}', {module_name}.run]")
        root_mappings_map.append(f"    ['{wasm_properties.mappings_root}', '{config_name}']")
    
    sw_content = f"""{'\n'.join(imports)}

const runFunctionsMap = new Map([
    {',\n'.join(run_functions_map)}
]);

const rootMappingsModuleNamesMap = new Map([
    {',\n'.join(root_mappings_map)}
]);

self.isServerReady = false;
self.uuid = null;

self.addEventListener('install', (event) => {{
    self.skipWaiting();
}});

self.addEventListener('message', (event) => {{
    if (event.data.type === 'SET_UUID') {{
        self.uuid = event.data.uuid;
        console.log(`Received UUID: ${'{self.uuid}'}`);
    }}
}});

self.addEventListener('activate', (event) => {{
    event.waitUntil(
        self.clients.claim().then(() => {{
            const waitForServer = new Promise((resolve, reject) => {{
                const timeout = setTimeout(() => reject(new Error('Server initialization timeout')), 15000);
                const interval = setInterval(() => {{
                    if (self.isServerReady) {{
                        clearTimeout(timeout);
                        clearInterval(interval);
                        resolve();
                    }}
                }}, 100);
            }});

            waitForServer
                .then(() => {{
                    console.log('Server is ready');
                    return self.clients.matchAll();
                }})
                .then((clients) => {{
                    const uniqueId = self.uuid || 'default';
                    clients.forEach((client) => {{
                        client.postMessage({{ type: 'SERVICE_WORKER_READY', id: uniqueId }});
                    }});
                }})
                .catch((error) => {{
                    console.error('Failed to notify clients:', error);
                }});
        }})
    );
}});

const handlersMap = new Map();

async function loadModules(modules) {{
    for (const moduleName of modules) {{
        const run = runFunctionsMap.get(moduleName);

        if (!run) {{
            console.warn(`Модуль ${'{moduleName}'} не найден!`);
            continue;
        }}
        try {{
            const handler = await run();
            handlersMap.set(moduleName, handler);
        }} catch (error) {{
            console.error(`Не удалось загрузить модуль ${'{moduleName}'}:`, error);
        }}
    }}
    self.isServerReady = true;
}}

const queryParams = new URL(self.location.href).searchParams;
const modulesToLoad = queryParams.getAll('module');

(async () => {{
    await loadModules(modulesToLoad);
}})();

self.addEventListener('fetch', (event) => {{
    const url = new URL(event.request.url);

    for (const [path, moduleName] of rootMappingsModuleNamesMap.entries()) {{
        if (url.pathname.startsWith(path)) {{
            const handler = handlersMap.get(moduleName);
            if (handler) {{
                event.respondWith((async () => {{
                    const response = await handler(event.request);

                    const allSetCookies = [...response.headers.entries()]
                        .filter(([name]) => name.toLowerCase() === 'x-set-cookie')
                        .map(([, value]) => value);

                    if (allSetCookies.length > 0) {{
                        const clients = await self.clients.matchAll();
                        for (const client of clients) {{
                            for (const cookie of allSetCookies) {{
                                client.postMessage({{
                                    type: 'SET_COOKIE',
                                    value: cookie
                                }});
                            }}
                        }}
                    }}

                    return response;
                }})());
            }}
            return;
        }}
    }}
}});
"""

    with open(sw_file_path, "w", encoding="utf-8") as f:
        f.write(sw_content)
    
    print(f"Service Worker успешно создан в {sw_file_path}")

async def generate_sw(generation_properties):
    if generation_properties.frontend_properties.project_type == 'module':
        generate_sw_js(generation_properties)
    else:
        raise NotImplementedError(f"Поддержка project_type '{generation_properties.frontend_properties.project_type}' еще не разработана")
