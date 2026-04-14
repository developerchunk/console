import { create } from 'zustand'

export const useAppStore = create((set) => ({
  apps: [],
  currentApp: null,
  loading: false,
  error: null,
  
  setApps: (apps) => set({ apps }),
  setCurrentApp: (app) => set({ currentApp: app }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  addApp: (app) => set((state) => {
    if (!app || (!app.appId && !app.id && !app.packageName && !app.bundleId && !app.appName)) {
      return state
    }

    const nextRef = app.appId || app.id || app.packageName || app.bundleId
    const exists = state.apps.some((item) => {
      const ref = item?.appId || item?.id || item?.packageName || item?.bundleId
      return ref && nextRef && ref === nextRef
    })

    if (exists) return state

    return { apps: [...state.apps, app] }
  }),
  updateApp: (appRef, updatedData) => set((state) => {
    const matches = (app) =>
      app?.appId === appRef ||
      app?.id === appRef ||
      app?.packageName === appRef ||
      app?.bundleId === appRef

    return {
      apps: state.apps.map((app) => (matches(app) ? { ...app, ...updatedData } : app)),
      currentApp: matches(state.currentApp)
        ? { ...state.currentApp, ...updatedData }
        : state.currentApp
    }
  }),
  removeApp: (packageName) => set((state) => ({
    apps: state.apps.filter((app) => app.packageName !== packageName),
    currentApp: state.currentApp?.packageName === packageName ? null : state.currentApp
  }))
}))
