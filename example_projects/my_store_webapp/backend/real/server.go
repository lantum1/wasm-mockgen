package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	_ "github.com/lib/pq"
)

type Product struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

type OrderRequest struct {
	ID int `json:"id"`
}

var (
	db *sql.DB
	mu sync.Mutex
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

	rows, err := db.Query("SELECT id, name, price, stock FROM products")
	if err != nil {
		http.Error(w, "Failed to fetch products", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock); err != nil {
			http.Error(w, "Failed to scan product", http.StatusInternalServerError)
			return
		}
		products = append(products, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func orderProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to begin transaction", http.StatusInternalServerError)
		return
	}

	var stock int
	err = tx.QueryRow("SELECT stock FROM products WHERE id = $1 FOR UPDATE", req.ID).Scan(&stock)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	if stock <= 0 {
		tx.Rollback()
		http.Error(w, "Product out of stock", http.StatusBadRequest)
		return
	}

	_, err = tx.Exec("UPDATE products SET stock = stock - 1 WHERE id = $1", req.ID)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to update stock", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`
        INSERT INTO purchased_products (product_id, quantity)
        VALUES ($1, 1)
        ON CONFLICT (product_id)
        DO UPDATE SET quantity = purchased_products.quantity + 1
    `, req.ID)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to update purchases", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Transaction failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Заказ оформлен!"})
}

func getPurchased(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	rows, err := db.Query("SELECT product_id, quantity FROM purchased_products")
	if err != nil {
		http.Error(w, "Failed to fetch purchases", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	purchased := make(map[int]int)
	for rows.Next() {
		var productID, quantity int
		if err := rows.Scan(&productID, &quantity); err != nil {
			http.Error(w, "Failed to scan purchases", http.StatusInternalServerError)
			return
		}
		purchased[productID] = quantity
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(purchased)
}

func main() {
	var err error
	db, err = sql.Open("postgres", "host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable")
	if err != nil {
		log.Fatal("Ошибка подключения к БД:", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal("PostgreSQL недоступен:", err)
	}

	http.HandleFunc("/my-store/products", getProducts)
	http.HandleFunc("/my-store/order", orderProduct)
	http.HandleFunc("/my-store/purchased", getPurchased)

	log.Println("Сервер запущен на :8080")
	err_http := http.ListenAndServe(":8080", nil)
	if err_http != nil {
		log.Fatal(err_http)
	}

	select {}
}
