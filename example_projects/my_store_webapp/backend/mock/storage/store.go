package storage

type Product struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

type OrderRequest struct {
	ID int `json:"id"`
}

type OrderResponse struct {
	Message string `json:"message"`
}

type Store interface {
	GetAllProducts() ([]Product, error)
	GetProductByID(id int) (*Product, error)
	DecrementStock(id int) error
	IncrementPurchased(id int) error
	GetAllPurchased() (map[int]int, error)
}
