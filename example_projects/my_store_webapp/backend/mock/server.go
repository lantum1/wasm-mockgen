package main

import (
	"encoding/json"
	"log"
	"net/http"

	"my-store/storage"
)

type convert func(w http.ResponseWriter)

var enableCors convert
var store storage.Store

func makeServer(s storage.Store, corsFunc convert) {
	store = s
	enableCors = corsFunc

	http.HandleFunc("/my-store/products", getProducts)
	http.HandleFunc("/my-store/order", orderProduct)
	http.HandleFunc("/my-store/purchased", getPurchased)
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	enableCors(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	products, err := store.GetAllProducts()
	if err != nil {
		message := "failed to get products, error " + err.Error()
		log.Fatalln(message)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(products)
}

func orderProduct(w http.ResponseWriter, r *http.Request) {
	enableCors(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req storage.OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		message := "invalid orderProduct request, error " + err.Error()
		log.Fatalln(message)
		http.Error(w, message, http.StatusBadRequest)
		return
	}

	if err := store.DecrementStock(req.ID); err != nil {
		message := "failed to decrement available count, error" + err.Error()
		log.Fatalln(message)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	if err := store.IncrementPurchased(req.ID); err != nil {
		message := "failed to update purchase count, error " + err.Error()
		log.Fatalln(message)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	resp := storage.OrderResponse{Message: "Order placed successfully"}
	json.NewEncoder(w).Encode(resp)
}

func getPurchased(w http.ResponseWriter, r *http.Request) {
	enableCors(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	data, err := store.GetAllPurchased()
	if err != nil {
		message := "failed to get purchased data, error " + err.Error()
		log.Fatalln(message)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(data)
}
