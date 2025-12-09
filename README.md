### 分支管理
- 我们的main分支就是最后提交的作业
- 每个人均创建一个或多个属于自己的分支，提交自己做好的内容(重点是别污染main分支)
- feature/DataCollection中是我做的方便数据采集的脚本

---

下面是AI总结的多人协作指南：
### 团队协作指南（Git/GitHub + VS Code，简明版）

#### 协作模型
- 主干受保护：main 只通过 Pull Request 合并，禁止直接推送。
- 开发在分支：每个需求/缺陷独立分支，按约定命名，提交小步快跑。
- 线性历史：优先 rebase 更新分支；合并采用 Squash 合并，保持干净历史。

#### 提交流程（本地到 PR）
1) 同步主干
````powershell
git switch main
git pull --rebase --autostash origin main
````
2) 切分支开发
````powershell
git switch -c feature/<topic>
# 开发与小步提交
git add -A
git commit -m "feat: <简述为什么> (#issue)"
````
3) 与主干保持同步
````powershell
git fetch origin
git rebase origin/main
# 冲突->解决->git add <文件> -> git rebase --continue
````
4) 推送并创建 PR(也可以确认无误后，自己本地合并main分支再推送)
````powershell
git push -u origin feature/<topic>
# 在 GitHub 打开 PR -> 选择目标分支 main -> 填写模板 -> 请求评审
````
5) 评审通过后合并
- 合并策略：Squash and merge
- 删除分支：合并后删除远程与本地分支

#### 冲突处理
````powershell
git fetch origin
git rebase origin/main
# 解决 <<<<<<< ======= >>>>>> 标记
git add <冲突文件>
git rebase --continue
# 放弃本次 rebase（必要时）
git rebase --abort
````
VS Code：源代码管理面板可逐块解决冲突，保存后继续 rebase。
#### 常用命令（Windows）
````powershell
# 设置签名（当前仓库）
git config user.name "Your Name"
git config user.email "you@example.com"

# 设置上游并推送
git push -u origin feature/<topic>

# 更新分支并保持线性历史
git fetch origin
git rebase origin/main

# 用远程强制覆盖本地（谨慎）
git reset --hard origin/main

# 用本地覆盖远程（极其谨慎）
git push --force-with-lease
