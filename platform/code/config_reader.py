import yaml

from generation_config import GenerationConfig, FrontendProjectProperties, WASMGenerationProperties, GenerationProperties
from global_config import GlobalConfig, AdapterConfig, BackendAdapterConfig

def load_yaml(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def parse_global_config(path: str) -> GlobalConfig:
    raw_config = load_yaml(path)
    adapters = {
        name: AdapterConfig(
            enable_async=adapter_data.get("enable-async", False),
            backend=BackendAdapterConfig(path=adapter_data["backend"]["path"]),
            frontend=adapter_data.get("frontend", {})
        )
        for name, adapter_data in raw_config.get("adapters", {}).items()
    }
    return GlobalConfig(adapters=adapters)

def parse_generation_config(path: str) -> GenerationConfig:
    raw_config = load_yaml(path)
    generation_props = raw_config.get("generation-properties", {})
    frontend_props = generation_props.get("frontend-properties", {})
    configs = {
        name: WASMGenerationProperties(
            adapter=config_data["adapter"],
            mappings_root=config_data["mappings-root"],
            backend_source_path=config_data["backend-source-path"]
        )
        for name, config_data in generation_props.get("configs", {}).items()
    }
    return GenerationConfig(
        generation_properties=GenerationProperties(
            target_root_path=generation_props["target-root-path"],
            frontend_properties=FrontendProjectProperties(
                project_type=frontend_props["project-type"],
                test_framework=frontend_props["test-framework"]
            ),
            configs=configs
        )
    )

def load_configs(global_config_path: str, generation_config_path: str):
    global_config = parse_global_config(global_config_path)
    generation_config = parse_generation_config(generation_config_path)
    return global_config, generation_config


