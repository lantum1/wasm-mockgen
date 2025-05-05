"use client";
import { useState, useEffect } from "react";

export default function ProductList({ onPurchase }) {
  const [products, setProducts] = useState([]);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const fetchProducts = () => {
    fetch(`${apiBaseUrl}/my-store/products`)
      .then((res) => res.json())
      .then((data) => {
        const sortedProducts = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setProducts(sortedProducts);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const orderProduct = (id) => {
    fetch(`${apiBaseUrl}/my-store/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then(() => {
        fetchProducts();
        onPurchase();
      })
      .catch(console.error);
  };

  return (
    <div className="product-list p-4">
      <h2 className="text-xl font-bold mb-4">Список товаров</h2>
      <ul>
        {products.map((product) => (
          <li
            key={product.id}
            className="product-item p-2 border-b flex justify-between items-center"
          >
            <span className="product-info">{product.name} - {product.price}₽ (Осталось: {product.stock})</span>
            <button
              onClick={() => orderProduct(product.id)}
              disabled={product.stock === 0}
              className="buy-button bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              Купить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
