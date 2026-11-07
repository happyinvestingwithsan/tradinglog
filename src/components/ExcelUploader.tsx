"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { RawTrade } from "@/lib/tradeEngine";
import { UploadSimple, FileXls, CloudArrowUp, SpinnerGap } from "@phosphor-icons/react";

interface ExcelUploaderProps {
  onDataLoaded: (trades: RawTrade[]) => void;
}

export default function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsParsing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse as raw rows first to dynamically detect where the header lies
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Find header row containing essential columns
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (Array.isArray(row)) {
            const hasSymbol = row.some(cell => String(cell).trim().toLowerCase() === "symbol");
            const hasTradeType = row.some(cell => String(cell).trim().toLowerCase() === "trade type");
            const hasQuantity = row.some(cell => String(cell).trim().toLowerCase() === "quantity");
            
            if (hasSymbol && hasTradeType && hasQuantity) {
              headerRowIndex = i;
              headers = row.map(cell => String(cell).trim());
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          throw new Error("Could not find required columns (Symbol, Trade Type, Quantity) in the sheet. Make sure this is a Zerodha tradebook export.");
        }

        const trades: RawTrade[] = [];
        
        // Process data rows below header row
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row) || row.length === 0 || !row[headers.indexOf("Symbol")]) {
            continue;
          }
          
          const getVal = (headerName: string) => {
            const idx = headers.findIndex(h => h.toLowerCase() === headerName.toLowerCase());
            return idx !== -1 ? row[idx] : undefined;
          };

          const symbol = String(getVal("Symbol"));
          const tradeDate = String(getVal("Trade Date"));
          const tradeType = String(getVal("Trade Type")).toLowerCase();
          const quantity = parseInt(String(getVal("Quantity")));
          const price = parseFloat(String(getVal("Price")));
          const tradeId = String(getVal("Trade ID") || "");
          const orderId = String(getVal("Order ID") || "");
          const executionTime = String(getVal("Order Execution Time") || getVal("Trade Date") || "");
          let expiryDate = "";
          const expiryIdx = headers.findIndex(h => h.toLowerCase().includes("expiry") || h.toLowerCase() === "unnamed: 14");
          if (expiryIdx !== -1 && row[expiryIdx]) {
            expiryDate = String(row[expiryIdx]);
          }

          if (symbol && tradeType && !isNaN(quantity) && !isNaN(price)) {
            trades.push({
              symbol,
              tradeDate,
              tradeType: (tradeType.includes("buy") ? "buy" : "sell"),
              quantity,
              price,
              tradeId,
              orderId,
              executionTime: executionTime.replace(" ", "T"),
              expiryDate
            });
          }
        }

        if (trades.length === 0) {
          throw new Error("No trades were successfully parsed. Check file contents.");
        }

        onDataLoaded(trades);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setError(err.message || "Failed to parse the Excel file.");
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file.");
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      processFile(file);
    } else {
      setError("Please drop a valid Excel file (.xlsx or .xls).");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`bg-white border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] shadow-sm ${
          isDragging 
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.01]" 
            : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />

        {isParsing ? (
          <div className="space-y-4">
            <SpinnerGap className="w-10 h-10 text-emerald-600 animate-spin" weight="bold" />
            <p className="text-slate-600 text-sm font-semibold font-mono">Analyzing tradebook structures...</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-2 mx-auto">
              <CloudArrowUp className="w-6 h-6 text-emerald-600" weight="bold" />
            </div>
            <div>
              <p className="text-slate-900 text-sm font-bold font-mono">Import Zerodha Tradebook</p>
              <p className="text-slate-500 text-xs mt-1 font-mono">
                Drag and drop your `tradebook-XXXXXX-FO.xlsx` file here, or click to browse.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
