# 音乐工具箱 Ultra · 最终发布清单

版本：`v13.5.8`  
发布方式：GitHub Actions 整目录发布

## 自动校验

- [ ] `npm ci --ignore-scripts` 成功。
- [ ] `node tools/build_standalone.mjs` 成功。
- [ ] `node tools/build_release.mjs` 成功。
- [ ] `node tools/build_release.mjs --check` 成功。
- [ ] `node tools/qa_final.mjs` 失败项为 0。
- [ ] GitHub Actions 的 `Run complete QA`、`Verify complete offline release` 和 `Deploy` 均为绿色。

## 两台真机抽查

- [ ] iPhone：顶部栏避开灵动岛，页面底部无异常大块空白。
- [ ] Android：同一页面无按钮重叠，底栏可完整点击。
- [ ] 首次联网进入后断网重开，核心页面、重拍 02、制音和二维码仍可用。
- [ ] 节拍器第一拍直接发出 `02 · 木块强击·圆润`，普通拍是电子 Click。
- [ ] 调音器可持续显示长音，不只识别第一下音头；离开调音器后麦克风被释放。
- [ ] iPhone 长音不稳定时，设置中的“iPhone 延音增强”可切换且切换后重新连接麦克风。
- [ ] 视唱手机默认每行 1 小节，平板默认每行 2 小节；谱面布局按钮可切换并记忆。
- [ ] 视唱上一题、上一句、句数、下一句、下一题五项在 iPhone 与 Android 上均完整可见。
- [ ] 渐速训练默认精简版；精简版只含间隔减/加、启停、撤回、完成，高级字段只在高级版出现。
- [ ] 和弦根音气泡在左端 C、中央半音和右端 C 均正对刻度。
- [ ] 五线谱、简谱和鼓谱均可缩放；多行鼓谱没有重复播放指针。
- [ ] PWA 更新失败时保留当前完整缓存，并显示具体缺失资源。
- [ ] 进入页“添加到桌面”在支持的平台触发安装，不支持的平台显示对应指引。
- [ ] 进入页“重置缓存”确认后清除 CacheStorage、Service Worker 和本地数据，并重新联网载入。

## 发布包边界

- [ ] 压缩包中只有当前最终版项目。
- [ ] 不包含旧版 CSS/JS、旧验证报告或历史 ZIP。
- [ ] `Music-Toolbox-Ultra-v13.5.8-Standalone.html` 与 PWA 同源生成。
