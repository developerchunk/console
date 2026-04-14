import { create } from 'zustand'

export const useScreenStore = create((set) => ({
  screens: [],
  currentScreen: null,
  jsonContent: null,
  loading: false,
  error: null,
  
  setScreens: (screens) => set({ screens }),
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setJsonContent: (jsonContent) => set({ jsonContent }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  addScreen: (screen) => set((state) => ({ screens: [...state.screens, screen] })),
  updateScreen: (screenName, updatedData) => set((state) => ({
    screens: state.screens.map((screen) => 
      screen.screenName === screenName ? { ...screen, ...updatedData } : screen
    ),
    currentScreen: state.currentScreen?.screenName === screenName 
      ? { ...state.currentScreen, ...updatedData } 
      : state.currentScreen
  })),
  removeScreen: (screenName) => set((state) => ({
    screens: state.screens.filter((screen) => screen.screenName !== screenName),
    currentScreen: state.currentScreen?.screenName === screenName ? null : state.currentScreen
  }))
}))
