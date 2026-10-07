'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import EmployeeTable from '@/components/employees/EmployeeTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/types';

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

  // 탭 복귀 시 직원 목록 최신화
  useRefetchOnFocus(fetchEmployees);

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
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />

      <main className="max-w-[1400px] mx-auto px-0 pt-3 pb-20 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        <PageHeader title="직원 관리" />

        {/* 에러 배너 */}
        {error && (
          <div className="ui-alert ui-alert--danger mx-4 mb-4 sm:mx-0">
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="직원 삭제 확인"
        description={(
          <>
            선택한 <strong>{selectedIds.length}명</strong>의 직원을 삭제하시겠습니까?
            <span className="ui-caption" style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: 'var(--space-1)' }}>
              기존 스케줄 데이터는 유지됩니다.
            </span>
          </>
        )}
        confirmLabel="삭제 확인"
        danger
        pending={isDeleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
