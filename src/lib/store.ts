import { create } from 'zustand'
import type { TodoWithRelations, AreaWithTodos, TagWithTodos, ScheduleView, SortOption, GroupOption } from './types'

interface AppState {
  // UI State
  isAddTaskModalOpen: boolean
  setAddTaskModalOpen: (open: boolean) => void
  
  editingTodo: TodoWithRelations | null
  setEditingTodo: (todo: TodoWithRelations | null) => void
  
  // Modal navigation - track if we opened a sub-task from parent modal
  parentTodoInModal: TodoWithRelations | null
  setParentTodoInModal: (todo: TodoWithRelations | null) => void
  
  scheduleView: ScheduleView
  setScheduleView: (view: ScheduleView) => void
  
  scheduleDate: Date
  setScheduleDate: (date: Date) => void
  
  // Sort and Group preferences
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  
  groupOption: GroupOption
  setGroupOption: (option: GroupOption) => void
  
  // Completion animation
  completedTodoId: string | null
  setCompletedTodoId: (id: string | null) => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // UI State
  isAddTaskModalOpen: false,
  setAddTaskModalOpen: (open) => set({ isAddTaskModalOpen: open }),
  
  editingTodo: null,
  setEditingTodo: (todo) => set({ editingTodo: todo }),
  
  parentTodoInModal: null,
  setParentTodoInModal: (todo) => set({ parentTodoInModal: todo }),
  
  scheduleView: 'today',
  setScheduleView: (view) => set({ scheduleView: view }),
  
  scheduleDate: new Date(),
  setScheduleDate: (date) => set({ scheduleDate: date }),
  
  // Sort and Group
  sortOption: 'priority',
  setSortOption: (option) => set({ sortOption: option }),
  
  groupOption: 'none',
  setGroupOption: (option) => set({ groupOption: option }),
  
  // Completion animation
  completedTodoId: null,
  setCompletedTodoId: (id) => set({ completedTodoId: id }),
  
  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
