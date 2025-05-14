package storage

import (
	"database/sql"
	"errors"
)

type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (d *DBStore) GetAllProducts() ([]Product, error) {
	rows, err := d.db.Query("SELECT id, name, price, stock FROM products")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (d *DBStore) GetProductByID(id int) (*Product, error) {
	row := d.db.QueryRow("SELECT id, name, price, stock FROM products WHERE id = $1", id)

	var p Product
	if err := row.Scan(&p.ID, &p.Name, &p.Price, &p.Stock); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}
	return &p, nil
}

func (d *DBStore) DecrementStock(id int) error {
	res, err := d.db.Exec("UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0", id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("not enough stock")
	}
	return nil
}

func (d *DBStore) IncrementPurchased(id int) error {
	_, err := d.db.Exec(`
		INSERT INTO purchased_products(product_id, quantity) 
		VALUES($1, 1) 
		ON CONFLICT (product_id) DO UPDATE SET quantity = purchased_products.quantity + 1
	`, id)
	return err
}

func (d *DBStore) GetAllPurchased() (map[int]int, error) {
	rows, err := d.db.Query("SELECT product_id, quantity FROM purchased_products")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int]int)
	for rows.Next() {
		var id, count int
		if err := rows.Scan(&id, &count); err != nil {
			return nil, err
		}
		result[id] = count
	}
	return result, nil
}
