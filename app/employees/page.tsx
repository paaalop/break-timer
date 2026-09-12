'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import EmployeeTable from '@/components/employees/EmployeeTable';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import type { Role, DayOfWeek, ShiftType, CreateEmployeeInput, UpdateEmployeeInput } from '@/types';

export default function EmployeesPage() {
  const {
    employees,
    isLoading,
    error,
    fetchEmployees,
    addEmployee,
    updateEmployee,
    softDeleteEmployee,
    softDeleteEmployees,
  } = useEmployeeStore();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenAdd = () => {
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleSaveNew = async (data: CreateEmployeeInput) => {
    await addEmployee(data);
    setIsAdding(false);
  };

  const handleUpdate = async (id: string, data: UpdateEmployeeInput) => {
    await updateEmployee(id, data);
  };

  const handleDeleteSingle = async (id: string) => {
    await softDeleteEmployee(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  // 선택 토글 핸들러
  const handleToggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 일괄 삭제 확인
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await softDeleteEmployees(selectedIds);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <Header />

      <main className="max-w-[1400px] mx-auto px-0 pt-3 pb-20 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        {/* 페이지 헤더 */}
        <div className="px-6 sm:px-4" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: '28px', color: 'var(--color-neutral-dark)', margin: 0 }}>
              직원 관리
            </h1>
          </div>
        </div>

        {/* 에러 배너 */}
        {error && (
          <div
            className="mx-4 sm:mx-0"
            style={{
              border: '1px solid #C0392B',
              background: '#FDF2F1',
              padding: '10px 16px',
              borderRadius: 4,
              fontSize: 13,
              color: '#C0392B',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* 직원 테이블 (DayCard 양식의 카드로 렌더링) */}
        <EmployeeTable
          employees={employees}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectOne={handleToggleSelectOne}
          isAdding={isAdding}
          onOpenAdd={handleOpenAdd}
          onDeleteSelected={() => setShowDeleteConfirm(true)}
          onDeleteSingle={handleDeleteSingle}
          onCancelAdd={handleCancelAdd}
          onSaveNew={handleSaveNew}
          onUpdate={handleUpdate}
          isLoading={isLoading}
        />
      </main>

      {/* 일괄 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: 24,
              maxWidth: 340,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>직원 삭제 확인</h2>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-dark)', marginBottom: 20, lineHeight: 1.5 }}>
              선택한 <strong>{selectedIds.length}명</strong>의 직원을 삭제하시겠습니까?
              <br />
              <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                기존 스케줄 데이터는 유지됩니다.
              </span>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                disabled={isDeleting}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  border: 'none',
                  borderRadius: 4,
                  background: '#C0392B',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
