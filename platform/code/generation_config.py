from dataclasses import dataclass
from typing import Dict

@dataclass
class FrontendProjectProperties:
    project_type: str
    test_framework: str
    
@dataclass
class WASMGenerationProperties:
    adapter: str
    mappings_root: str
    backend_source_path: str
    
@dataclass
class GenerationProperties:
    target_root_path: str
    frontend_properties: FrontendProjectProperties
    configs: Dict[str, WASMGenerationProperties]
    
@dataclass
class GenerationConfig:
    generation_properties: GenerationProperties
    
