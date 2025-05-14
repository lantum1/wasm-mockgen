package storage

import (
	"fmt"
	"sync"
)

type MapStore struct {
	mu        sync.Mutex
	products  map[int]*Product
	purchased map[int]int
}

func NewMapStore() *MapStore {
	return &MapStore{
		products: map[int]*Product{
			1: {ID: 1, Name: "Coca-Cola напиток сильногазированный 0.33 мл", Price: 119, Stock: 7},
			2: {ID: 2, Name: "Макаронное изделие \"Каждый День\"", Price: 79, Stock: 30},
			3: {ID: 3, Name: "Сухарики \"Три корочки\" 100 гр", Price: 45, Stock: 20},
		},
		purchased: make(map[int]int),
	}
}

func (s *MapStore) GetAllProducts() ([]Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var list []Product
	for _, p := range s.products {
		list = append(list, *p)
	}
	return list, nil
}

func (s *MapStore) GetProductByID(id int) (*Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.products[id]
	if !ok {
		return nil, fmt.Errorf("product not found")
	}
	copy := *p
	return &copy, nil
}

func (s *MapStore) DecrementStock(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.products[id]
	if !ok || p.Stock <= 0 {
		return fmt.Errorf("out of stock")
	}
	p.Stock--
	return nil
}

func (s *MapStore) IncrementPurchased(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.purchased[id]++
	return nil
}

func (s *MapStore) GetAllPurchased() (map[int]int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	copyMap := make(map[int]int)
	for k, v := range s.purchased {
		copyMap[k] = v
	}
	return copyMap, nil
}
