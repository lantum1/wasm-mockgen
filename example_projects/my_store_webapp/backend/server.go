package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	// wasmhttp "github.com/nlepage/go-wasm-http-server/v2"
)

type Product struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

var (
	products = map[int]*Product{
		1: {ID: 1, Name: "Товар 1", Price: 100, Stock: 5},
		2: {ID: 2, Name: "Товар 2", Price: 200, Stock: 3},
		3: {ID: 3, Name: "Товар 3", Price: 300, Stock: 2},
	}
	purchasedProducts = map[int]int{}
	mu                sync.Mutex
)

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	mu.Lock()
	defer mu.Unlock()

	productList := make([]Product, 0, len(products))
	for _, p := range products {
		productList = append(productList, *p)
	}

	json.NewEncoder(w).Encode(productList)
}

func getPurchased(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	mu.Lock()
	defer mu.Unlock()

	json.NewEncoder(w).Encode(purchasedProducts)
}

func orderProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()
	product, exists := products[req.ID]
	if !exists || product.Stock <= 0 {
		http.Error(w, "Product not available", http.StatusBadRequest)
		return
	}

	product.Stock--
	purchasedProducts[req.ID]++

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Заказ оформлен!"})
}

func main() {
	http.HandleFunc("/my-store/products", getProducts)
	http.HandleFunc("/my-store/order", orderProduct)
	http.HandleFunc("/my-store/purchased", getPurchased)

	log.Println("Сервер запущен на :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}

	select {}
}
