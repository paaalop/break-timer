-- Add is_minor column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false NOT NULL;
