package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	wasmhttp "github.com/nlepage/go-wasm-http-server/v2"
)

type ProductResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

type OrderRequest struct {
	ID int `json:"id"`
}

type OrderResponse struct {
	Message string `json:"message"`
}

type PurchasedProductsResponse map[int]int

var (
	products = map[int]*ProductResponse{
		1: {ID: 1, Name: "Coca-Cola сильногазированный напиток 330 мл", Price: 110, Stock: 5},
		2: {ID: 2, Name: "Макаронные изделия 'Каждый День'", Price: 40, Stock: 10},
		3: {ID: 3, Name: "Сухарики Три Корочки со вкусом Сметана и Зелень 60 гр", Price: 62, Stock: 4},
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

	productList := make([]ProductResponse, 0, len(products))
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

	response := PurchasedProductsResponse(purchasedProducts)
	json.NewEncoder(w).Encode(response)
}

func orderProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неверный запрос", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	product, exists := products[req.ID]
	if !exists || product.Stock <= 0 {
		http.Error(w, "Товар недоступен", http.StatusBadRequest)
		return
	}

	product.Stock--
	purchasedProducts[req.ID]++

	w.Header().Set("Content-Type", "application/json")
	resp := OrderResponse{Message: "Заказ оформлен!"}
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/my-store/products", getProducts)
	http.HandleFunc("/my-store/order", orderProduct)
	http.HandleFunc("/my-store/purchased", getPurchased)

	log.Println("Сервер запущен на :8080")
	_, err := wasmhttp.Serve(nil)
	if err != nil {
		log.Fatal(err)
	}

	select {}
}
