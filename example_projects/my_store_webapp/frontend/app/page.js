"use client";
import { useState } from "react";
import ProductList from "./components/ProductList";
import PurchasedList from "./components/PurchasedList";

export default function Home() {
  const [refresh, setRefresh] = useState(false);

  const handlePurchase = () => {
    setRefresh(!refresh);
  };

  return (
    <div className="page-container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Магазин</h1>
      <ProductList onPurchase={handlePurchase} />
      <PurchasedList key={refresh} />
    </div>
  );
}
