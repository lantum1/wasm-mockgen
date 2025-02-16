import os
import sys

def modify_js_file(config_name, mappings_root, input_js_path, target_root_path):
    output_path = os.path.join(target_root_path, config_name)
    os.makedirs(output_path, exist_ok=True)
    
    output_file = os.path.join(output_path, f"{config_name}.js")
    
    try:
        with open(input_js_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        lines[0] = f"let base = '{mappings_root}';\n"
        lines[1] = f"const wasm = '/{config_name}/server.wasm';\n"
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print(f"Файл успешно сгенерирован: {output_file}")
    except Exception as e:
        print(f"Ошибка при обработке файла: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Использование: python generate_js.py <config_name> <mappings_root> <target_root_path>")
        sys.exit(1)
    
    config_name = sys.argv[1]
    mappings_root = sys.argv[2]
    target_root_path = os.path.abspath(sys.argv[3])
    
    modify_js_file(config_name, mappings_root, "./skeleton.js", target_root_path)
