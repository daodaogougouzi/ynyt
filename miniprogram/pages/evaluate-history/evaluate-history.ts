import { EvaluateHistoryItem, getEvaluateHistory } from '../../utils/storage'

export {}

Page({
  data: {
    list: [] as EvaluateHistoryItem[],
  },

  onShow() {
    this.setData({
      list: getEvaluateHistory(),
    })
  },
})
