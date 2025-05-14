package main

import (
	"log"
	"my-store/storage"
	"net/http"

	wasmhttp "github.com/nlepage/go-wasm-http-server/v2"
)

func enableCORS(w http.ResponseWriter) {
	//no need to enable CORS on WebAssembly mock-server
}

func main() {
	mockStore := storage.NewMapStore()
	makeServer(mockStore, enableCORS)

	log.Println("Server is running")
	_, err := wasmhttp.Serve(nil)
	if err != nil {
		log.Fatal(err)
	}

	select {}
}
