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
            continue; // Skip empty rows or separator lines
          }
          
          const getVal = (headerName: string) => {
            const idx = headers.findIndex(h => h.toLowerCase() === headerName.toLowerCase());
            return idx !== -1 ? row[idx] : undefined;
          };

          // Handle Zerodha Excel structure mapping
          const symbol = String(getVal("Symbol"));
          const tradeDate = String(getVal("Trade Date"));
          const tradeType = String(getVal("Trade Type")).toLowerCase();
          const quantity = parseInt(String(getVal("Quantity")));
          const price = parseFloat(String(getVal("Price")));
          const tradeId = String(getVal("Trade ID") || "");
          const orderId = String(getVal("Order ID") || "");
          const executionTime = String(getVal("Order Execution Time") || getVal("Trade Date") || "");
          // Unnamed: 14 is often Expiry Date in Zerodha F&O reports, let's look for column index 14 or labeled expiry
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
              executionTime: executionTime.replace(" ", "T"), // Format to parseable ISO
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
        className={`glass-panel border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col items-center justify-center min-h-[220px] ${
          isDragging 
            ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)] scale-[1.01]" 
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.01]"
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
            <SpinnerGap className="w-10 h-10 text-emerald-400 animate-spin" weight="light" />
            <p className="text-zinc-400 text-sm font-medium">Analyzing spreadsheet structures...</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 mx-auto">
              <CloudArrowUp className="w-6 h-6 text-zinc-400" weight="light" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Import Zerodha Tradebook</p>
              <p className="text-zinc-500 text-xs mt-1">
                Drag and drop your `tradebook-XXXXXX-FO.xlsx` file here, or click to browse.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs text-center font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
