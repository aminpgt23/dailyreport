import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import ExcelJS from "exceljs";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function styleCategory(cell: ExcelJS.Cell, value: string) {
  if (value === "Normal") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
    cell.font = { color: { argb: "166534" }, bold: false };
  } else if (value === "Medium") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF9C3" } };
    cell.font = { color: { argb: "854D0E" }, bold: false };
  } else if (value === "High") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
    cell.font = { color: { argb: "991B1B" }, bold: false };
  }
}

function styleStatus(cell: ExcelJS.Cell, value: string) {
  if (value === "OK") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
    cell.font = { color: { argb: "166534" }, bold: false };
  } else if (value === "B.OK") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
    cell.font = { color: { argb: "991B1B" }, bold: false };
  }
}

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const area = searchParams.get("area");
  const assetNumber = searchParams.get("assetNumber");

  const where: Record<string, unknown> = {};

  if (startDate) {
    where.tanggal = {
      ...(where.tanggal as Record<string, unknown> || {}),
      gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
    };
  }
  if (endDate) {
    where.tanggal = {
      ...(where.tanggal as Record<string, unknown> || {}),
      lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  }
  if (area) where.area = area;
  if (assetNumber) where.assetNumber = assetNumber;

  const reports = await prisma.machineReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Daily Report";
  const ws = wb.addWorksheet("My Machine");

  const headerStyle: Partial<ExcelJS.Style> = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } },
    font: { color: { argb: "FFFFFF" }, bold: true, size: 11 },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
    },
  };

  const bodyStyle: Partial<ExcelJS.Style> = {
    alignment: { horizontal: "center", vertical: "middle" },
    font: { size: 10 },
    border: {
      top: { style: "thin", color: { argb: "D1D5DB" } },
      bottom: { style: "thin", color: { argb: "D1D5DB" } },
      left: { style: "thin", color: { argb: "D1D5DB" } },
      right: { style: "thin", color: { argb: "D1D5DB" } },
    },
  };

  const leftStyle: Partial<ExcelJS.Style> = {
    ...bodyStyle,
    alignment: { horizontal: "left", vertical: "middle", wrapText: true },
  };

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "No", key: "no", width: 5 },
    { header: "Tanggal", key: "tanggal", width: 13 },
    { header: "Asset Number", key: "assetNumber", width: 18 },
    { header: "Deskripsi", key: "deskripsi", width: 45 },
    { header: "Kategori", key: "kategori", width: 12 },
    { header: "Pelapor", key: "pelapor", width: 18 },
    { header: "Status", key: "status", width: 9 },
    { header: "Action Perbaikan", key: "actionPerbaikan", width: 45 },
    { header: "Pelaksana", key: "pelaksana", width: 22 },
    { header: "Tgl Pelaksanaan", key: "tglPelaksanaan", width: 16 },
  ];

  ws.columns = columns;

  const headerRow = ws.getRow(1);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header as string;
    Object.assign(cell, headerStyle);
  });
  headerRow.height = 22;

  reports.forEach((r, i) => {
    const row = ws.getRow(i + 2);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = r.tanggal.toISOString().slice(0, 10);
    row.getCell(3).value = r.assetNumber;
    row.getCell(4).value = r.deskripsi;
    row.getCell(5).value = r.kategori;
    row.getCell(6).value = r.pelapor;
    row.getCell(7).value = r.status;
    row.getCell(8).value = r.actionPerbaikan || "";
    row.getCell(9).value = r.pelaksana || "";
    row.getCell(10).value = r.tanggalPelaksanaan ? r.tanggalPelaksanaan.toISOString().slice(0, 10) : "";

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      if (c === 4 || c === 8) {
        Object.assign(cell, leftStyle);
      } else {
        Object.assign(cell, bodyStyle);
      }
    }

    styleCategory(row.getCell(5), r.kategori);
    styleStatus(row.getCell(7), r.status);
  });

  const areaLabel = area || "Semua";
  const dateRef = startDate ? new Date(startDate) : new Date();
  const monthLabel = monthNames[dateRef.getMonth()];
  const yearLabel = dateRef.getFullYear();
  const filename = `MyMachine_${areaLabel}_${monthLabel}${yearLabel}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
