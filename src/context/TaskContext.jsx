import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { generateId } from '../utils/dateUtils'

const TaskContext = createContext(null)

// Default project
const DEFAULT_PROJECT = {
  id: 'proj-default',
  name: 'My Project',
  color: '#5a7d9a'
}

// Empty initial tasks
const INITIAL_TASKS = {
  'proj-default': []
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
    // If deleting the last project, create a fresh default first
    if (projects.length <= 1) {
      const freshDefault = {
        id: 'proj-' + Date.now(),
        name: 'My Project',
        color: '#5a7d9a'
      }
      setProjects([freshDefault])
      setTasksByProject({ [freshDefault.id]: [] })
      setActiveProjectId(freshDefault.id)
      setSelectedTaskId(null)
      return true
    }
    
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
  }, [projects, activeProjectId, setProjects, setTasksByProject, setActiveProjectId, setSelectedTaskId])

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
