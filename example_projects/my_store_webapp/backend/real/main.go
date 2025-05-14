package main

import (
	"database/sql"
	"log"
	"my-store/storage"
	"net/http"

	_ "github.com/lib/pq"
)

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func main() {
	connStr := "host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}

	realStore := storage.NewDBStore(db)
	makeServer(realStore, enableCORS)

	log.Println("Server is running")
	err_http := http.ListenAndServe(":8080", nil)
	if err_http != nil {
		log.Fatal(err_http)
	}

	select {}
}
