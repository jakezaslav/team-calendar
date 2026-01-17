import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { generateId } from '../utils/dateUtils'

const TaskContext = createContext(null)

// Default project
const DEFAULT_PROJECT = {
  id: 'proj-default',
  name: 'Marketing Campaign',
  color: '#e07a5f'
}

// Sample tasks for the default project
const INITIAL_TASKS = {
  'proj-default': [
    {
      id: 'task-1',
      name: 'Creative Cut - Refreshed',
      assignee: 'Sarah Chen',
      startDate: '2024-07-02',
      endDate: '2024-07-04',
      color: '#e07a5f',
    },
    {
      id: 'task-2',
      name: 'Creative Cut - Refreshed',
      assignee: 'Marcus Webb',
      startDate: '2024-07-05',
      endDate: '2024-07-05',
      color: '#e07a5f',
    },
    {
      id: 'task-3',
      name: 'Creative Cut - Refreshed',
      assignee: 'Sarah Chen',
      startDate: '2024-07-08',
      endDate: '2024-07-09',
      color: '#f4d19b',
    },
    {
      id: 'task-4',
      name: 'Live Creative Review/Edit Session Refreshed',
      assignee: 'Team',
      startDate: '2024-07-09',
      endDate: '2024-07-10',
      color: '#81a684',
    },
    {
      id: 'task-5',
      name: 'Internal Cut - Refreshed',
      assignee: 'Elena Rodriguez',
      startDate: '2024-07-10',
      endDate: '2024-07-13',
      color: '#f4d19b',
    },
    {
      id: 'task-6',
      name: 'Creative Cut - Eye Candy',
      assignee: 'Team',
      startDate: '2024-07-15',
      endDate: '2024-07-20',
      color: '#d4a574',
    },
    {
      id: 'task-7',
      name: 'Internal Review Refreshed',
      assignee: 'Marcus Webb',
      startDate: '2024-07-15',
      endDate: '2024-07-16',
      color: '#7d9bb8',
    },
    {
      id: 'task-8',
      name: 'Synthesize Notes Refreshed',
      assignee: 'Sarah Chen',
      startDate: '2024-07-16',
      endDate: '2024-07-17',
      color: '#c9b8d4',
    },
    {
      id: 'task-9',
      name: 'Rough Cut - Refreshed',
      assignee: 'Elena Rodriguez',
      startDate: '2024-07-17',
      endDate: '2024-07-21',
      color: '#f4d19b',
    },
    {
      id: 'task-10',
      name: 'Live Rough Review Refreshed',
      assignee: 'Team',
      startDate: '2024-07-22',
      endDate: '2024-07-24',
      color: '#81a684',
    },
    {
      id: 'task-11',
      name: 'Rough Cut Synthesize Notes Refreshed',
      assignee: 'Sarah Chen',
      startDate: '2024-07-24',
      endDate: '2024-07-25',
      color: '#f4d19b',
    },
    {
      id: 'task-12',
      name: 'Fine Cut - Refreshed',
      assignee: 'Marcus Webb',
      startDate: '2024-07-26',
      endDate: '2024-07-27',
      color: '#e07a5f',
    },
    {
      id: 'task-13',
      name: 'Record & Select VO Refreshed',
      assignee: 'Elena Rodriguez',
      startDate: '2024-07-26',
      endDate: '2024-07-27',
      color: '#f7e96c',
    },
  ]
}

const INITIAL_PROJECTS = [DEFAULT_PROJECT]

export function TaskProvider({ children }) {
  const [projects, setProjects] = useLocalStorage('team-calendar-projects', INITIAL_PROJECTS)
  const [tasksByProject, setTasksByProject] = useLocalStorage('team-calendar-tasks-v2', INITIAL_TASKS)
  const [activeProjectId, setActiveProjectId] = useLocalStorage('team-calendar-active-project', DEFAULT_PROJECT.id)
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage('team-calendar-selected', null)

  // Get current project
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  )

  // Get tasks for current project
  const tasks = useMemo(() => 
    tasksByProject[activeProjectId] || [],
    [tasksByProject, activeProjectId]
  )

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  // Project operations
  const addProject = useCallback((projectData) => {
    const newProject = {
      ...projectData,
      id: generateId().replace('task-', 'proj-'),
    }
    setProjects(prev => [...prev, newProject])
    setTasksByProject(prev => ({ ...prev, [newProject.id]: [] }))
    return newProject
  }, [setProjects, setTasksByProject])

  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    ))
  }, [setProjects])

  const deleteProject = useCallback((projectId) => {
    // Don't delete if it's the only project
    if (projects.length <= 1) return false
    
    setProjects(prev => prev.filter(project => project.id !== projectId))
    setTasksByProject(prev => {
      const newTasks = { ...prev }
      delete newTasks[projectId]
      return newTasks
    })
    
    // Switch to another project if we deleted the active one
    if (activeProjectId === projectId) {
      const remainingProject = projects.find(p => p.id !== projectId)
      if (remainingProject) {
        setActiveProjectId(remainingProject.id)
      }
    }
    
    return true
  }, [projects, activeProjectId, setProjects, setTasksByProject, setActiveProjectId])

  const switchProject = useCallback((projectId) => {
    setActiveProjectId(projectId)
    setSelectedTaskId(null) // Clear selection when switching projects
  }, [setActiveProjectId, setSelectedTaskId])

  // Task operations
  const addTask = useCallback((taskData) => {
    const newTask = {
      ...taskData,
      id: generateId(),
    }
    setTasksByProject(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), newTask]
    }))
    return newTask
  }, [setTasksByProject, activeProjectId])

  const updateTask = useCallback((taskId, updates) => {
    setTasksByProject(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }))
  }, [setTasksByProject, activeProjectId])

  const deleteTask = useCallback((taskId) => {
    setTasksByProject(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter(task => task.id !== taskId)
    }))
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null)
    }
  }, [setTasksByProject, activeProjectId, selectedTaskId, setSelectedTaskId])

  const selectTask = useCallback((taskId) => {
    setSelectedTaskId(taskId)
  }, [setSelectedTaskId])

  const clearSelection = useCallback(() => {
    setSelectedTaskId(null)
  }, [setSelectedTaskId])

  const value = {
    // Projects
    projects,
    activeProject,
    activeProjectId,
    addProject,
    updateProject,
    deleteProject,
    switchProject,
    // Tasks
    tasks,
    selectedTask,
    selectedTaskId,
    addTask,
    updateTask,
    deleteTask,
    selectTask,
    clearSelection,
  }

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider')
  }
  return context
}
