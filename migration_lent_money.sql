-- Migration: Add Pending Money Tracking to MSKSphere
-- This migration adds a table to track pending money (money to receive and money to give)
-- Execute this in the Supabase SQL Editor

-- Create pending_money table
CREATE TABLE IF NOT EXISTS pending_money (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'receive' (money lent to you) or 'give' (money you owe)
  person_name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on pending_money
ALTER TABLE pending_money ENABLE ROW LEVEL SECURITY;

-- Create policies for pending_money
CREATE POLICY "Users can view their own pending money"
  ON pending_money FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending money"
  ON pending_money FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending money"
  ON pending_money FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending money"
  ON pending_money FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for pending_money
CREATE INDEX IF NOT EXISTS idx_pending_money_user ON pending_money(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_money_date ON pending_money(date);
CREATE INDEX IF NOT EXISTS idx_pending_money_status ON pending_money(status);
CREATE INDEX IF NOT EXISTS idx_pending_money_type ON pending_money(type);

-- Create trigger for updated_at on pending_money
CREATE TRIGGER update_pending_money_updated_at
  BEFORE UPDATE ON pending_money
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
