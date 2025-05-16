import os
import shutil

async def copy_service_worker_utils(frontend_properties, target_root_path):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    service_worker_utils_path = os.path.join(current_dir, "service_worker_utils", frontend_properties.test_framework, frontend_properties.project_type)
    
    if not os.path.isdir(service_worker_utils_path):
        raise FileNotFoundError(f"Папка {service_worker_utils_path} не найдена")
    
    service_worker_utils_file = os.path.join(service_worker_utils_path, "serviceWorkerUtils.js")
    
    if not os.path.isfile(service_worker_utils_file):
        raise FileNotFoundError(f"Необходимый для данного тестового фреймворка и типа проекта вспомогательный файл {service_worker_utils_file} не найден")
    
    os.makedirs(target_root_path, exist_ok=True)
    shutil.copy(service_worker_utils_file, target_root_path)
    
    print(f"Вспомогательный файл serviceWorkerUtils.js успешно скопирован в {target_root_path}")
