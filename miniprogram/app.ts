const DEFAULT_STORAGE = {
  xjt_favorites: [],
  xjt_evaluate_history: [],
  xjt_college_binding: '',
}

App<IAppOption>({
  globalData: {},
  onLaunch() {
    Object.keys(DEFAULT_STORAGE).forEach((key) => {
      const currentValue = wx.getStorageSync(key)
      if (typeof currentValue === 'undefined' || currentValue === '') {
        wx.setStorageSync(key, DEFAULT_STORAGE[key as keyof typeof DEFAULT_STORAGE])
      }
    })
  },
})
