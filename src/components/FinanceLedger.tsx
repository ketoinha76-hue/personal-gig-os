import React, { useState } from "react";
import { Transaction, Project, Tuition } from "../types";

interface FinanceLedgerProps {
  transactions: Transaction[];
  projects: Project[];
  onSaveTx: (tx: any) => Promise<void>;
  onDeleteTx: (id: string) => Promise<void>;
  handleInvoiceScan: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
  tuitionRecords: Tuition[];
  onSaveTuition: (record: any) => Promise<void>;
  onDeleteTuition: (id: string) => Promise<void>;
  onSyncTuitionsToFinance: () => Promise<void>;
}

export default function FinanceLedger({
  transactions,
  projects,
  onSaveTx,
  onDeleteTx,
  handleInvoiceScan,
  showToast,
  tuitionRecords = [],
  onSaveTuition,
  onDeleteTuition,
  onSyncTuitionsToFinance
}: FinanceLedgerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ledger" | "tuition">("ledger");
  
  // Transaction Modal States
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "p-1",
    type: "Thu",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0]
  });

  // Tuition Modal States
  const [showTuitionModal, setShowTuitionModal] = useState(false);
  const [editTuitionItem, setEditTuitionItem] = useState<Tuition | null>(null);
  const [tuitionFormData, setTuitionFormData] = useState({
    studentName: "",
    courseName: "Guitar Đệm Hát Cơ Bản",
    tuitionFee: "2000000",
    totalLessons: "10",
    completedLessons: "0",
    paymentStatus: "Chưa đóng" as "Đã đóng" | "Chưa đóng",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.note) {
      showToast("Vui lòng điền đầy đủ các thông tin.", "warning");
      return;
    }
    const payload = {
      ...formData,
      amount: Number(formData.amount)
    };
    await onSaveTx(payload);
    setShowModal(false);
    setFormData({
      projectId: "p-1",
      type: "Thu",
      amount: "",
      note: "",
      date: new Date().toISOString().split("T")[0]
    });
  };

  const handleOpenAddTuition = () => {
    setEditTuitionItem(null);
    setTuitionFormData({
      studentName: "",
      courseName: "Guitar Đệm Hát Cơ Bản",
      tuitionFee: "2000000",
      totalLessons: "10",
      completedLessons: "0",
      paymentStatus: "Chưa đóng",
      notes: ""
    });
    setShowTuitionModal(true);
  };

  const handleOpenEditTuition = (record: Tuition) => {
    setEditTuitionItem(record);
    setTuitionFormData({
      studentName: record.studentName,
      courseName: record.courseName,
      tuitionFee: record.tuitionFee.toString(),
      totalLessons: record.totalLessons.toString(),
      completedLessons: record.completedLessons.toString(),
      paymentStatus: record.paymentStatus,
      notes: record.notes || ""
    });
    setShowTuitionModal(true);
  };

  const handleTuitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuitionFormData.studentName) {
      showToast("Họ tên học viên không được để trống.", "warning");
      return;
    }

    const payload = {
      ...editTuitionItem,
      studentName: tuitionFormData.studentName,
      courseName: tuitionFormData.courseName,
      tuitionFee: Number(tuitionFormData.tuitionFee) || 0,
      totalLessons: Number(tuitionFormData.totalLessons) || 10,
      completedLessons: Number(tuitionFormData.completedLessons) || 0,
      paymentStatus: tuitionFormData.paymentStatus,
      notes: tuitionFormData.notes,
      syncedToFinance: editTuitionItem ? editTuitionItem.syncedToFinance : false
    };

    // If changing from "Chưa đóng" to "Đã đóng", we keep syncedToFinance as false so it can be synced.
    // If changing from "Đã đóng" to "Chưa đóng", we force syncedToFinance to false.
    if (payload.paymentStatus === "Chưa đóng") {
      payload.syncedToFinance = false;
    }

    await onSaveTuition(payload);
    setShowTuitionModal(false);
  };

  // Tuition Metrics Calculations
  const totalExpectedTuition = tuitionRecords.reduce((acc, r) => acc + r.tuitionFee, 0);
  const totalCollectedTuition = tuitionRecords
    .filter((r) => r.paymentStatus === "Đã đóng")
    .reduce((acc, r) => acc + r.tuitionFee, 0);
  const totalPendingTuition = totalExpectedTuition - totalCollectedTuition;
  const pendingSyncCount = tuitionRecords.filter(
    (r) => r.paymentStatus === "Đã đóng" && !r.syncedToFinance
  ).length;

  return (
    <div>
      {/* Upper Navigation and Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-main)]">Sổ sách Nhật ký Thu Chi</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Theo dõi hoạt động tài chính đa ngành và học viên dạy Guitar của Long Hub OS Pro.</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === "ledger" ? (
            <>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all">
                Quét hóa đơn AI
                <input type="file" accept="image/*" className="hidden" onChange={handleInvoiceScan} />
              </label>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
              >
                + Ghi nhận Thu / Chi
              </button>
            </>
          ) : (
            <button
              onClick={handleOpenAddTuition}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              + Học viên đóng học phí mới
            </button>
          )}
        </div>
      </div>

      {/* Sub tabs switches */}
      <div className="flex border-b border-[var(--border-color)] mb-6">
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "ledger"
              ? "border-[var(--primary)] text-[var(--primary)] font-extrabold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          🗒️ Ghi sổ Nhật ký Thu Chi
        </button>
        <button
          onClick={() => setActiveSubTab("tuition")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "tuition"
              ? "border-[var(--primary)] text-[var(--primary)] font-extrabold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          🎸 Học phí & Lớp dạy Guitar ({tuitionRecords.length})
        </button>
      </div>

      {activeSubTab === "ledger" ? (
        <>
          {/* Segmented Profit by Project */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] mb-4 uppercase tracking-wider">📊 Lợi nhuận ròng phân tách theo Công việc</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {projects.map((p) => {
                const pTxs = transactions.filter((t) => t.projectId === p.id);
                const pThu = pTxs.filter((t) => t.type === "Thu").reduce((a, b) => a + Number(b.amount), 0);
                const pChi = pTxs.filter((t) => t.type === "Chi").reduce((a, b) => a + Number(b.amount), 0);
                const pProfit = pThu - pChi;

                return (
                  <div key={p.id} className="p-4 bg-[var(--overlay-01)] rounded-xl border border-[var(--border-color)]">
                    <div className="text-xs text-[var(--text-muted)] font-bold">{p.name}</div>
                    <div className={`text-lg font-extrabold mt-2 ${pProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {pProfit >= 0 ? "+" : ""}{pProfit.toLocaleString("vi-VN")} đ
                    </div>
                    <div className="text-[10.5px] text-[var(--text-muted)] mt-1">
                      Thu: {pThu.toLocaleString("vi-VN")}đ | Chi: {pChi.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions List */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider">🗒️ Nhật ký thu chi gần đây</h3>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-[var(--overlay-03)] hover:bg-[var(--overlay-06)] border border-[var(--border-color)] text-[var(--text-main)] text-[11.5px] font-bold rounded-lg cursor-pointer transition-all"
              >
                🖨️ Xuất báo cáo tài chính
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border-color)]">
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Ngày</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Công việc</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Loại</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Số tiền</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Ghi chú</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)] text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[var(--border-color)] hover:bg-[var(--overlay-01)] transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-main)]">{tx.date}</td>
                      <td className="py-3 px-4 text-[var(--text-main)]">{tx.projectName}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10.5px] ${tx.type === "Thu" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          {tx.type === "Thu" ? "Thu nhập" : "Chi phí"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text-main)]">{tx.amount.toLocaleString("vi-VN")} đ</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{tx.note}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm("Bạn có chắc chắn muốn XÓA giao dịch này khỏi sổ sách?")) {
                              onDeleteTx(tx.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-xs cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                        >
                          ✕ Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[12px] text-[var(--text-muted)] italic">
                        Chưa có giao dịch thu chi nào được ghi sổ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Tuition Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <div className="p-5 bg-gradient-to-br from-[rgba(99,102,241,0.06)] to-[rgba(99,102,241,0.02)] border border-[rgba(99,102,241,0.12)] rounded-2xl shadow-sm">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-400">Tổng Học Phí Kỳ Vọng</span>
              <div className="text-2xl font-black text-[var(--text-main)] mt-1.5">{totalExpectedTuition.toLocaleString("vi-VN")} đ</div>
              <span className="text-[10px] text-[var(--text-muted)] block mt-1">Dự kiến thu từ {tuitionRecords.length} học viên lớp Guitar.</span>
            </div>
            <div className="p-5 bg-gradient-to-br from-[rgba(16,185,129,0.06)] to-[rgba(16,185,129,0.02)] border border-[rgba(16,185,129,0.12)] rounded-2xl shadow-sm">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-400">Đã Thu Đầy Đủ</span>
              <div className="text-2xl font-black text-emerald-400 mt-1.5">{totalCollectedTuition.toLocaleString("vi-VN")} đ</div>
              <span className="text-[10px] text-[var(--text-muted)] block mt-1">Đã hoàn thành nghĩa vụ đóng học phí khóa học.</span>
            </div>
            <div className="p-5 bg-gradient-to-br from-[rgba(245,158,11,0.06)] to-[rgba(245,158,11,0.02)] border border-[rgba(245,158,11,0.12)] rounded-2xl shadow-sm">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-400">Còn Lại Chưa Thu</span>
              <div className="text-2xl font-black text-amber-500 mt-1.5">{totalPendingTuition.toLocaleString("vi-VN")} đ</div>
              <span className="text-[10px] text-[var(--text-muted)] block mt-1">Học phí chưa nộp hoặc đang trong chu kỳ nợ học viên.</span>
            </div>
          </div>

          {/* Sync Trigger Action Box */}
          {pendingSyncCount > 0 && (
            <div className="bg-gradient-to-r from-amber-950/20 to-indigo-950/20 border border-amber-500/30 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-[var(--text-main)] flex items-center gap-2">
                  <span>⚡</span> Phát hiện {pendingSyncCount} học viên đã đóng học phí chưa được đồng bộ!
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">Cần đồng bộ để hệ thống tự động ghi nhận doanh thu vào Sổ sách thu chi (Port of syncTuitionToGiaoDich).</p>
              </div>
              <button
                onClick={onSyncTuitionsToFinance}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shrink-0 uppercase tracking-wider"
              >
                Đồng bộ vào sổ sách ngay
              </button>
            </div>
          )}

          {/* Tuition logs panel */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-5">🎸 Danh sách học viên lớp Guitar & Học phí</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border-color)]">
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Học viên</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Khóa học</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Học phí</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Tiến trình buổi học</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Học phí</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)]">Trạng thái sổ</th>
                    <th className="py-3 px-4 font-bold text-[var(--text-muted)] text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {tuitionRecords.map((rec) => {
                    const percent = Math.min(100, Math.round((rec.completedLessons / rec.totalLessons) * 100)) || 0;
                    return (
                      <tr key={rec.id} className="border-b border-[var(--border-color)] hover:bg-[var(--overlay-01)] transition-colors">
                        <td className="py-4 px-4">
                          <strong className="text-[var(--text-main)] block">{rec.studentName}</strong>
                          {rec.notes && <span className="text-[11px] text-[var(--text-muted)] italic block mt-0.5">{rec.notes}</span>}
                        </td>
                        <td className="py-4 px-4 text-[var(--text-main)] font-semibold">{rec.courseName}</td>
                        <td className="py-4 px-4 font-bold text-indigo-400">{rec.tuitionFee.toLocaleString("vi-VN")} đ</td>
                        <td className="py-4 px-4 w-48">
                          <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1">
                            <span>Đã học: {rec.completedLessons}/{rec.totalLessons}</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.paymentStatus === "Đã đóng" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {rec.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {rec.paymentStatus === "Đã đóng" ? (
                            rec.syncedToFinance ? (
                              <span className="text-[11px] text-emerald-500 font-medium">✔️ Đã ghi sổ</span>
                            ) : (
                              <span className="text-[11px] text-amber-500 font-semibold italic">⏳ Chờ đồng bộ</span>
                            )
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] italic">Chưa nộp tiền</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleOpenEditTuition(rec)}
                              className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-bold text-xs cursor-pointer transition-all"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn XÓA học viên "${rec.studentName}"?`)) {
                                  onDeleteTuition(rec.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-xs cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                            >
                              ✕ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {tuitionRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-[12px] text-[var(--text-muted)] italic">
                        Chưa tìm thấy hồ sơ học viên Guitar nào. Nhấn "+ Học viên đóng học phí mới" để tạo hồ sơ quản lý.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Manual Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">Ghi nhận Thu nhập / Chi phí</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Loại giao dịch</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Thu" className="bg-slate-800 text-white">Thu nhập (+)</option>
                    <option value="Chi" className="bg-slate-800 text-white">Chi phí (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Liên kết Công việc</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Số tiền (đ) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ngày giao dịch</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ghi chú giao dịch *</label>
                <input
                  type="text"
                  required
                  placeholder="Đổ xăng chạy xe..."
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--overlay-06)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--primary-hover)] shadow-sm"
                >
                  Ghi vào sổ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tuition Record Creation / Edit Modal */}
      {showTuitionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">
              {editTuitionItem ? "Cập nhật Hồ sơ học phí" : "Tạo mới Hồ sơ học phí"}
            </h3>
            <form onSubmit={handleTuitionSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Họ tên Học viên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={tuitionFormData.studentName}
                  onChange={(e) => setTuitionFormData({ ...tuitionFormData, studentName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Khóa học / Lớp</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Guitar Đệm Hát Cơ Bản"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={tuitionFormData.courseName}
                  onChange={(e) => setTuitionFormData({ ...tuitionFormData, courseName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Học phí (đ)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={tuitionFormData.tuitionFee}
                    onChange={(e) => setTuitionFormData({ ...tuitionFormData, tuitionFee: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Trạng thái đóng</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={tuitionFormData.paymentStatus}
                    onChange={(e) => setTuitionFormData({ ...tuitionFormData, paymentStatus: e.target.value as any })}
                  >
                    <option value="Chưa đóng" className="bg-slate-800 text-white">Chưa nộp học phí</option>
                    <option value="Đã đóng" className="bg-slate-800 text-white">Đã nộp học phí</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">Tổng số buổi học</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={tuitionFormData.totalLessons}
                    onChange={(e) => setTuitionFormData({ ...tuitionFormData, totalLessons: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">Số buổi đã học</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={tuitionFormData.completedLessons}
                    onChange={(e) => setTuitionFormData({ ...tuitionFormData, completedLessons: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ghi chú học viên</label>
                <input
                  type="text"
                  placeholder="Dạy kèm tuần 2 buổi vào T3, T7..."
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={tuitionFormData.notes}
                  onChange={(e) => setTuitionFormData({ ...tuitionFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowTuitionModal(false)}
                  className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--overlay-06)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700 shadow-sm"
                >
                  {editTuitionItem ? "Cập nhật hồ sơ" : "Tạo hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
