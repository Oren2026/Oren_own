using System.Drawing;

namespace MonsterClicker
{
    public partial class Form1 : Form
    {
        private readonly GameState _state = new();

        public Form1()
        {
            InitializeComponent();
            _state.ResetMonster();
            UpdateUI();
        }

        // ===== 點擊攻擊 =====
        private void PanelClick_MouseDown(object sender, MouseEventArgs e)
        {
            if (_state.MonsterCurrentHp <= 0) return;

            var (damage, isCrit) = _state.CalculateDamage();
            _state.DamageMonster(damage);

            // 顯示傷害數字
            ShowDamageFloat(damage, isCrit, e.Location);

            // 更新UI
            UpdateMonsterHp();
            UpdateStats();

            // 檢查擊殺
            if (_state.MonsterCurrentHp <= 0)
            {
                _state.KillMonster();
                _state.ResetMonster();
                UpdateAll();
                ShowKillEffect();
            }
        }

        // ===== 傷害數字特效 =====
        private readonly List<Label> _floatLabels = new();

        private void ShowDamageFloat(int damage, bool isCrit, Point basePos)
        {
            var lbl = new Label
            {
                Text = isCrit ? $"💥 {damage}" : damage.ToString(),
                Font = new Font("Microsoft JhengHei UI", isCrit ? 22F : 16F, FontStyle.Bold),
                ForeColor = isCrit ? Color.FromArgb(255, 220, 0) : Color.White,
                AutoSize = true,
                BackColor = Color.Transparent,
            };

            // 亂數偏移，避免重疊
            int offsetX = new Random().Next(-40, 40);
            int offsetY = new Random().Next(-20, 10);
            lbl.Location = new Point(basePos.X + offsetX, basePos.Y + offsetY);
            lbl.Tag = DateTime.Now.Ticks;

            panelClick.Controls.Add(lbl);
            lbl.BringToFront();
            _floatLabels.Add(lbl);

            // 動畫往上飄 + 淡出
            var anim = new System.Windows.Forms.Timer { Interval = 16 };
            int startY = lbl.Top;
            long startTime = DateTime.Now.Ticks;
            anim.Tick += (s, e) =>
            {
                long elapsed = DateTime.Now.Ticks - startTime;
                double progress = elapsed / 8000000.0; // 0.8秒

                if (progress >= 1.0)
                {
                    anim.Stop();
                    anim.Dispose();
                    if (lbl.Parent != null)
                        panelClick.Controls.Remove(lbl);
                    _floatLabels.Remove(lbl);
                    lbl.Dispose();
                }
                else
                {
                    lbl.Top = startY - (int)(progress * 60);
                    lbl.Left = lbl.Left + (int)(Math.Sin(progress * Math.PI * 2) * 1.5);
                    lbl.ForeColor = Color.FromArgb(
                        (int)(255 * (1 - progress)),
                        isCrit ? 220 : 255,
                        isCrit ? (int)(0 + progress * 100) : 255,
                        isCrit ? 0 : 255);
                }
            };
            anim.Start();
        }

        // ===== 擊殺特效 =====
        private void ShowKillEffect()
        {
            lblClickHint.Text = $"✅ 擊殺！\n+{_state.GoldReward} 金幣";
            lblClickHint.ForeColor = Color.FromArgb(255, 215, 0);

            Task.Delay(800).ContinueWith(_ =>
            {
                if (!IsDisposed)
                    BeginInvoke(() =>
                    {
                        lblClickHint.Text = "👾\n點擊怪物！";
                        lblClickHint.ForeColor = Color.FromArgb(180, 180, 180);
                    });
            });
        }

        // ===== 升級按鈕 =====
        private void BtnUpgradeAtk_Click(object sender, EventArgs e)
        {
            if (_state.UpgradeAttack())
            {
                FlashButton(btnUpgradeAtk, Color.FromArgb(100, 60, 60));
                UpdateAll();
            }
            else
            {
                ShakeButton(btnUpgradeAtk);
            }
        }

        private void BtnUpgradeCrit_Click(object sender, EventArgs e)
        {
            if (_state.CritChance >= 0.80)
            {
                FlashButton(btnUpgradeCrit, Color.FromArgb(150, 100, 20));
                return;
            }
            if (_state.UpgradeCrit())
            {
                FlashButton(btnUpgradeCrit, Color.FromArgb(100, 80, 30));
                UpdateAll();
            }
            else
            {
                ShakeButton(btnUpgradeCrit);
            }
        }

        private void BtnUpgradeCritMult_Click(object sender, EventArgs e)
        {
            if (_state.UpgradeCritMult())
            {
                FlashButton(btnUpgradeCritMult, Color.FromArgb(80, 60, 100));
                UpdateAll();
            }
            else
            {
                ShakeButton(btnUpgradeCritMult);
            }
        }

        // ===== 進入下一關 =====
        private void BtnNextLevel_Click(object sender, EventArgs e)
        {
            _state.NextLevel();
            lblClickHint.Text = $"⬆️ 關卡 {_state.Level}\n{_state.MonsterName}";
            UpdateAll();

            Task.Delay(600).ContinueWith(_ =>
            {
                if (!IsDisposed)
                    BeginInvoke(() =>
                    {
                        lblClickHint.Text = "👾\n點擊怪物！";
                        lblClickHint.ForeColor = Color.FromArgb(180, 180, 180);
                    });
            });
        }

        // ===== UI 更新 =====
        private void UpdateAll()
        {
            UpdateTopBar();
            UpdateMonsterHp();
            UpdateMonsterName();
            UpdateStats();
            UpdateUpgradeButtons();
        }

        private void UpdateTopBar()
        {
            lblLevel.Text = $"關卡 {_state.Level}";
            lblGoldValue.Text = _state.Gold.ToString();
        }

        private void UpdateMonsterName()
        {
            lblMonsterName.Text = _state.MonsterName;
        }

        private void UpdateMonsterHp()
        {
            int max = _state.MonsterMaxHp;
            int cur = _state.MonsterCurrentHp;
            progressHp.Maximum = max;
            progressHp.Value = Math.Max(0, cur);

            // HP bar 顏色：綠→黃→紅
            double ratio = (double)cur / max;
            if (ratio > 0.6)
                progressHp.ForeColor = Color.FromArgb(0, 200, 80);
            else if (ratio > 0.3)
                progressHp.ForeColor = Color.FromArgb(220, 200, 0);
            else
                progressHp.ForeColor = Color.FromArgb(220, 60, 60);

            lblHpText.Text = $"HP: {cur} / {max}";
        }

        private void UpdateStats()
        {
            int atk = _state.AttackPower;
            double crit = _state.CritChance * 100;
            double mult = _state.CritMultiplier;
            double avgDmg = atk * (1 + crit / 100 * (mult - 1));

            lblAtk.Text = $"ATK: {atk}";
            lblCrit.Text = $"爆擊: {crit:F0}%";
            lblCritMult.Text = $"爆擊倍率: {mult:F1}x";
            lblDamage.Text = $"估計傷害: {avgDmg:F1}";
        }

        private void UpdateUpgradeButtons()
        {
            // 攻擊
            bool canAtk = _state.Gold >= _state.AttackUpgradeCost;
            btnUpgradeAtk.Text = $"升級攻擊 💰{_state.AttackUpgradeCost}\n(ATK +5)";
            btnUpgradeAtk.Enabled = canAtk;
            btnUpgradeAtk.BackColor = canAtk ? Color.FromArgb(80, 40, 40) : Color.FromArgb(50, 50, 50);

            // 爆率
            bool maxCrit = _state.CritChance >= 0.80;
            bool canCrit = _state.Gold >= _state.CritUpgradeCost && !maxCrit;
            btnUpgradeCrit.Text = maxCrit
                ? "爆率已滿 80%"
                : $"升級爆率 💰{_state.CritUpgradeCost}\n(+3%)";
            btnUpgradeCrit.Enabled = canCrit || maxCrit;
            btnUpgradeCrit.BackColor = maxCrit ? Color.FromArgb(50, 50, 50) : (canCrit ? Color.FromArgb(80, 60, 20) : Color.FromArgb(50, 50, 50));

            // 倍率
            bool canMult = _state.Gold >= _state.CritMultUpgradeCost;
            btnUpgradeCritMult.Text = $"升級倍率 💰{_state.CritMultUpgradeCost}\n(+0.1x)";
            btnUpgradeCritMult.Enabled = canMult;
            btnUpgradeCritMult.BackColor = canMult ? Color.FromArgb(60, 40, 80) : Color.FromArgb(50, 50, 50);
        }

        // ===== 按鈕回饋 =====
        private void FlashButton(Button btn, Color color)
        {
            var orig = btn.BackColor;
            btn.BackColor = color;
            Task.Delay(120).ContinueWith(_ =>
            {
                if (!IsDisposed)
                    BeginInvoke(() => btn.BackColor = orig);
            });
        }

        private void ShakeButton(Button btn)
        {
            var orig = btn.Left;
            var anim = new System.Windows.Forms.Timer { Interval = 30 };
            int count = 0;
            anim.Tick += (s, e) =>
            {
                btn.Left = orig + (count % 2 == 0 ? 5 : -5);
                count++;
                if (count >= 6)
                {
                    anim.Stop();
                    anim.Dispose();
                    btn.Left = orig;
                }
            };
            anim.Start();
        }
    }
}
