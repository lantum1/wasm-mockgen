import sys
import subprocess
import platform
import os
import asyncio
from config_reader import load_configs
from service_worker_creator import generate_sw
from service_worker_utils_creator import copy_service_worker_utils

async def run_final_tasks_async(generation_properties):
    tasks = [
        generate_sw(generation_properties),
        copy_service_worker_utils(
            generation_properties.frontend_properties, 
            generation_properties.target_root_path
        )
    ]

    try:
        await asyncio.gather(*tasks)
        print("Работа платформы успешно завершена")
    except Exception as e:
        print(f"Произошла ошибка при выполнении финальных задач - создании Service Worker js файла или Service Worker Utils js файла. Ошибка: {e}")
        sys.exit(1)

def get_python_cmd():
    return "python" if platform.system() == "Windows" else "python3"

def run_adapter(command: list, working_dir: str):
    print(f"Запускаем: {' '.join(command)} (в папке {working_dir})")
    process = subprocess.run(command, cwd=working_dir)
    if process.returncode != 0:
        print(f"Ошибка: {' '.join(command)} завершился с кодом {process.returncode}")
        sys.exit(1)

def run_adapter_async(command: list, working_dir: str):
    print(f"Запускаем (асинхронно): {' '.join(command)} (в папке {working_dir})")
    return subprocess.Popen(command, cwd=working_dir)

def create_directory_if_not_exists(path: str):
    os.makedirs(path, exist_ok=True)

def main(global_config_path: str, generation_config_path: str):
    global_config, generation_config = load_configs(global_config_path, generation_config_path)
    python_cmd = get_python_cmd()

    for config_name, wasm_generation_properties in generation_config.generation_properties.configs.items():
        print(f"\nОбрабатывается конфигурация: {config_name}")

        config_output_path = os.path.join(generation_config.generation_properties.target_root_path, config_name)
        create_directory_if_not_exists(config_output_path)

        adapter_name = wasm_generation_properties.adapter
        adapter_config = global_config.adapters.get(adapter_name)

        if not adapter_config:
            print(f"Ошибка: адаптер '{adapter_name}' не найден в глобальном конфиге.")
            continue

        backend_adapter_path = adapter_config.backend.path
        frontend_adapter_path = adapter_config.frontend.get(generation_config.generation_properties.frontend_properties.project_type)

        if not frontend_adapter_path:
            print(f"Ошибка: для project-type '{generation_config.generation_properties.frontend_properties.project_type}' не найден путь во фронтенд-адаптерах.")
            continue

        enable_async = adapter_config.enable_async
        target_root_path = generation_config.generation_properties.target_root_path

        backend_dir = os.path.dirname(backend_adapter_path)
        frontend_dir = os.path.dirname(frontend_adapter_path)

        print(f"  - Бэкенд-адаптер: {backend_adapter_path} (async={enable_async})")
        print(f"  - Фронтенд-адаптер: {frontend_adapter_path}")

        backend_args = [python_cmd, backend_adapter_path, config_name, wasm_generation_properties.backend_source_path, target_root_path]
        frontend_args = [python_cmd, frontend_adapter_path, config_name, wasm_generation_properties.mappings_root, target_root_path]

        if enable_async:
            backend_proc = run_adapter_async(backend_args, backend_dir)
            frontend_proc = run_adapter_async(frontend_args, frontend_dir)

            backend_exit_code = backend_proc.wait()
            frontend_exit_code = frontend_proc.wait()

            if backend_exit_code != 0:
                print(f"Ошибка: Бэкенд-адаптер завершился с кодом {backend_exit_code}")
                sys.exit(1)

            if frontend_exit_code != 0:
                print(f"Ошибка: Фронтенд-адаптер завершился с кодом {frontend_exit_code}")
                sys.exit(1)
        else:
            run_adapter(backend_args, backend_dir)
            run_adapter(frontend_args, frontend_dir)
    asyncio.run(run_final_tasks_async(generation_config.generation_properties))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python main.py <глобальный конфиг> <конфиг генерации>")
        sys.exit(1)
    
    global_config_path = sys.argv[1]
    generation_config_path = sys.argv[2]
    main(global_config_path, generation_config_path)
