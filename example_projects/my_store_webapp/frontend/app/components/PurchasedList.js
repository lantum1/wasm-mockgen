"use client";
import { useState, useEffect } from "react";

export default function PurchasedList() {
  const [purchased, setPurchased] = useState({});
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    fetch(`${apiBaseUrl}/my-store/purchased`)
      .then((res) => res.json())
      .then(setPurchased)
      .catch(console.error);
  }, []);

  return (
    <div className="purchased-list p-4">
      <h2 className="text-xl font-bold mb-4">Купленные товары</h2>
      {Object.keys(purchased).length === 0 ? (
        <p>Вы еще ничего не купили.</p>
      ) : (
        <ul>
          {Object.entries(purchased).map(([id, count]) => (
            <li key={id} className="purchased-item p-2 border-b">
              Товар ID {id}: {count} шт.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
