namespace MonsterClicker
{
    partial class Form1
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
                components.Dispose();
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        private void InitializeComponent()
        {
            // panels
            panelTop = new Panel();
            lblLevel = new Label();
            lblGold = new Label();
            lblGoldValue = new Label();

            panelMonster = new Panel();
            lblMonsterName = new Label();
            progressHp = new ProgressBar();
            lblHpText = new Label();

            panelClick = new Panel();
            lblClickHint = new Label();

            panelStats = new Panel();
            lblAtk = new Label();
            lblCrit = new Label();
            lblCritMult = new Label();
            lblDamage = new Label();

            panelUpgrades = new Panel();
            btnUpgradeAtk = new Button();
            btnUpgradeCrit = new Button();
            btnUpgradeCritMult = new Button();

            panelActions = new Panel();
            btnNextLevel = new Button();

            panelTop.SuspendLayout();
            panelMonster.SuspendLayout();
            panelClick.SuspendLayout();
            panelStats.SuspendLayout();
            panelUpgrades.SuspendLayout();
            panelActions.SuspendLayout();
            SuspendLayout();

            // ===== panelTop =====
            panelTop.BackColor = Color.FromArgb(30, 30, 30);
            panelTop.Dock = DockStyle.Top;
            panelTop.Controls.Add(lblLevel);
            panelTop.Controls.Add(lblGold);
            panelTop.Controls.Add(lblGoldValue);
            panelTop.Height = 50;

            lblLevel.AutoSize = true;
            lblLevel.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
            lblLevel.ForeColor = Color.White;
            lblLevel.Location = new Point(20, 14);
            lblLevel.Name = "lblLevel";
            lblLevel.Text = "關卡 1";

            lblGold.AutoSize = true;
            lblGold.Font = new Font("Microsoft JhengHei UI", 14F);
            lblGold.ForeColor = Color.Gold;
            lblGold.Location = new Point(200, 14);
            lblGold.Name = "lblGold";
            lblGold.Text = "💰";

            lblGoldValue.AutoSize = true;
            lblGoldValue.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
            lblGoldValue.ForeColor = Color.Gold;
            lblGoldValue.Location = new Point(230, 14);
            lblGoldValue.Name = "lblGoldValue";
            lblGoldValue.Text = "0";

            // ===== panelMonster =====
            panelMonster.BackColor = Color.FromArgb(45, 45, 48);
            panelMonster.Dock = DockStyle.Top;
            panelMonster.Controls.Add(lblMonsterName);
            panelMonster.Controls.Add(progressHp);
            panelMonster.Controls.Add(lblHpText);
            panelMonster.Height = 110;

            lblMonsterName.Font = new Font("Microsoft JhengHei UI", 16F, FontStyle.Bold);
            lblMonsterName.ForeColor = Color.White;
            lblMonsterName.Location = new Point(0, 10);
            lblMonsterName.Name = "lblMonsterName";
            lblMonsterName.Size = new Size(800, 30);
            lblMonsterName.Text = "史萊姆";
            lblMonsterName.TextAlign = ContentAlignment.MiddleCenter;

            progressHp.BackColor = Color.FromArgb(80, 80, 80);
            progressHp.ForeColor = Color.FromArgb(0, 200, 80);
            progressHp.Height = 28;
            progressHp.Location = new Point(100, 45);
            progressHp.Name = "progressHp";
            progressHp.Size = new Size(600, 28);
            progressHp.Style = ProgressBarStyle.Continuous;

            lblHpText.Font = new Font("Microsoft JhengHei UI", 11F);
            lblHpText.ForeColor = Color.FromArgb(200, 200, 200);
            lblHpText.Location = new Point(0, 78);
            lblHpText.Name = "lblHpText";
            lblHpText.Size = new Size(800, 25);
            lblHpText.Text = "HP: 50 / 50";
            lblHpText.TextAlign = ContentAlignment.MiddleCenter;

            // ===== panelClick =====
            panelClick.BackColor = Color.FromArgb(55, 55, 60);
            panelClick.Dock = DockStyle.Fill;
            panelClick.Controls.Add(lblClickHint);

            lblClickHint.Font = new Font("Microsoft JhengHei UI", 24F, FontStyle.Bold);
            lblClickHint.ForeColor = Color.FromArgb(180, 180, 180);
            lblClickHint.Location = new Point(0, 0);
            lblClickHint.Name = "lblClickHint";
            lblClickHint.Size = new Size(800, 350);
            lblClickHint.Text = "👾\n點擊怪物！";
            lblClickHint.TextAlign = ContentAlignment.MiddleCenter;
            lblClickHint.MouseDown += PanelClick_MouseDown;

            // ===== panelStats =====
            panelStats.BackColor = Color.FromArgb(35, 35, 38);
            panelStats.Dock = DockStyle.Bottom;
            panelStats.Height = 90;
            panelStats.Controls.Add(lblAtk);
            panelStats.Controls.Add(lblCrit);
            panelStats.Controls.Add(lblCritMult);
            panelStats.Controls.Add(lblDamage);

            lblAtk.AutoSize = true;
            lblAtk.Font = new Font("Microsoft JhengHei UI", 12F);
            lblAtk.ForeColor = Color.FromArgb(220, 100, 100);
            lblAtk.Location = new Point(20, 15);
            lblAtk.Name = "lblAtk";
            lblAtk.Text = "ATK: 10";

            lblCrit.AutoSize = true;
            lblCrit.Font = new Font("Microsoft JhengHei UI", 12F);
            lblCrit.ForeColor = Color.FromArgb(255, 200, 0);
            lblCrit.Location = new Point(20, 45);
            lblCrit.Name = "lblCrit";
            lblCrit.Text = "爆擊: 5%";

            lblCritMult.AutoSize = true;
            lblCritMult.Font = new Font("Microsoft JhengHei UI", 12F);
            lblCritMult.ForeColor = Color.FromArgb(255, 150, 0);
            lblCritMult.Location = new Point(200, 15);
            lblCritMult.Name = "lblCritMult";
            lblCritMult.Text = "爆擊倍率: 1.5x";

            lblDamage.AutoSize = true;
            lblDamage.Font = new Font("Microsoft JhengHei UI", 12F);
            lblDamage.ForeColor = Color.FromArgb(100, 200, 255);
            lblDamage.Location = new Point(200, 45);
            lblDamage.Name = "lblDamage";
            lblDamage.Text = "估計傷害: 10";

            // ===== panelUpgrades =====
            panelUpgrades.BackColor = Color.FromArgb(25, 25, 28);
            panelUpgrades.Dock = DockStyle.Bottom;
            panelUpgrades.Height = 90;
            panelUpgrades.Controls.Add(btnUpgradeAtk);
            panelUpgrades.Controls.Add(btnUpgradeCrit);
            panelUpgrades.Controls.Add(btnUpgradeCritMult);

            btnUpgradeAtk.BackColor = Color.FromArgb(80, 40, 40);
            btnUpgradeAtk.FlatAppearance.BorderSize = 0;
            btnUpgradeAtk.FlatStyle = FlatStyle.Flat;
            btnUpgradeAtk.Font = new Font("Microsoft JhengHei UI", 11F);
            btnUpgradeAtk.ForeColor = Color.White;
            btnUpgradeAtk.Location = new Point(20, 15);
            btnUpgradeAtk.Name = "btnUpgradeAtk";
            btnUpgradeAtk.Size = new Size(180, 55);
            btnUpgradeAtk.Text = "升級攻擊 💰10";
            btnUpgradeAtk.UseVisualStyleBackColor = false;
            btnUpgradeAtk.Click += BtnUpgradeAtk_Click;

            btnUpgradeCrit.BackColor = Color.FromArgb(80, 60, 20);
            btnUpgradeCrit.FlatAppearance.BorderSize = 0;
            btnUpgradeCrit.FlatStyle = FlatStyle.Flat;
            btnUpgradeCrit.Font = new Font("Microsoft JhengHei UI", 11F);
            btnUpgradeCrit.ForeColor = Color.White;
            btnUpgradeCrit.Location = new Point(220, 15);
            btnUpgradeCrit.Name = "btnUpgradeCrit";
            btnUpgradeCrit.Size = new Size(180, 55);
            btnUpgradeCrit.Text = "升級爆率 💰15";
            btnUpgradeCrit.UseVisualStyleBackColor = false;
            btnUpgradeCrit.Click += BtnUpgradeCrit_Click;

            btnUpgradeCritMult.BackColor = Color.FromArgb(60, 40, 80);
            btnUpgradeCritMult.FlatAppearance.BorderSize = 0;
            btnUpgradeCritMult.FlatStyle = FlatStyle.Flat;
            btnUpgradeCritMult.Font = new Font("Microsoft JhengHei UI", 11F);
            btnUpgradeCritMult.ForeColor = Color.White;
            btnUpgradeCritMult.Location = new Point(420, 15);
            btnUpgradeCritMult.Name = "btnUpgradeCritMult";
            btnUpgradeCritMult.Size = new Size(180, 55);
            btnUpgradeCritMult.Text = "升級倍率 💰25";
            btnUpgradeCritMult.UseVisualStyleBackColor = false;
            btnUpgradeCritMult.Click += BtnUpgradeCritMult_Click;

            // ===== panelActions =====
            panelActions.BackColor = Color.FromArgb(25, 25, 28);
            panelActions.Dock = DockStyle.Bottom;
            panelActions.Height = 70;
            panelActions.Controls.Add(btnNextLevel);

            btnNextLevel.BackColor = Color.FromArgb(40, 80, 40);
            btnNextLevel.FlatAppearance.BorderSize = 0;
            btnNextLevel.FlatStyle = FlatStyle.Flat;
            btnNextLevel.Font = new Font("Microsoft JhengHei UI", 13F, FontStyle.Bold);
            btnNextLevel.ForeColor = Color.White;
            btnNextLevel.Location = new Point(300, 12);
            btnNextLevel.Name = "btnNextLevel";
            btnNextLevel.Size = new Size(200, 48);
            btnNextLevel.Text = "進入下一關 ➜";
            btnNextLevel.UseVisualStyleBackColor = false;
            btnNextLevel.Click += BtnNextLevel_Click;

            // ===== Form1 =====
            AutoScaleDimensions = new SizeF(9F, 19F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 700);
            BackColor = Color.FromArgb(35, 35, 38);
            Controls.Add(panelClick);
            Controls.Add(panelActions);
            Controls.Add(panelUpgrades);
            Controls.Add(panelStats);
            Controls.Add(panelMonster);
            Controls.Add(panelTop);
            DoubleBuffered = true;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            Name = "Form1";
            StartPosition = FormStartPosition.CenterScreen;
            Text = "怪物點點樂";
            panelTop.ResumeLayout(false);
            panelTop.PerformLayout();
            panelMonster.ResumeLayout(false);
            panelMonster.PerformLayout();
            panelClick.ResumeLayout(false);
            panelStats.ResumeLayout(false);
            panelStats.PerformLayout();
            panelUpgrades.ResumeLayout(false);
            panelActions.ResumeLayout(false);
            ResumeLayout(false);
        }

        #endregion

        private Panel panelTop;
        private Label lblLevel;
        private Label lblGold;
        private Label lblGoldValue;
        private Panel panelMonster;
        private Label lblMonsterName;
        private ProgressBar progressHp;
        private Label lblHpText;
        private Panel panelClick;
        private Label lblClickHint;
        private Panel panelStats;
        private Label lblAtk;
        private Label lblCrit;
        private Label lblCritMult;
        private Label lblDamage;
        private Panel panelUpgrades;
        private Button btnUpgradeAtk;
        private Button btnUpgradeCrit;
        private Button btnUpgradeCritMult;
        private Panel panelActions;
        private Button btnNextLevel;
    }
}
