namespace MonsterClicker
{
    /// <summary>
    /// 遊戲狀態管理
    /// </summary>
    public class GameState
    {
        // 玩家資源
        public int Gold { get; set; } = 0;
        public int Level { get; set; } = 1;

        // 攻擊屬性
        public int AttackPower { get; set; } = 10;
        public int AttackLevel { get; set; } = 1;
        public int AttackUpgradeCost => (int)(10 * Math.Pow(1.3, AttackLevel - 1));

        // 爆擊屬性
        public double CritChance { get; set; } = 0.05;   // 5%
        public int CritLevel { get; set; } = 1;
        public int CritUpgradeCost => (int)(15 * Math.Pow(1.4, CritLevel - 1));

        // 爆擊倍率
        public double CritMultiplier { get; set; } = 1.5;
        public int CritMultLevel { get; set; } = 1;
        public int CritMultUpgradeCost => (int)(25 * Math.Pow(1.5, CritMultLevel - 1));

        // 怪物狀態
        public int MonsterMaxHp => (int)(50 * Math.Pow(Level, 1.4));
        public int MonsterCurrentHp { get; set; } = 50;
        public string MonsterName => Level switch
        {
            1 => "史萊姆",
            2 => "哥布林",
            3 => "狼人",
            4 => "食人魔",
            5 => "巨龍",
            _ => $"Lv.{Level} 怪物"
        };

        // 每關金幣
        public int GoldReward => Level * 10;

        /// <summary>
        /// 初始化或重生怪物
        /// </summary>
        public void ResetMonster()
        {
            MonsterCurrentHp = MonsterMaxHp;
        }

        /// <summary>
        /// 嘗試升級攻擊力
        /// </summary>
        /// <returns>是否成功</returns>
        public bool UpgradeAttack()
        {
            if (Gold >= AttackUpgradeCost)
            {
                Gold -= AttackUpgradeCost;
                AttackPower += 5;
                AttackLevel++;
                return true;
            }
            return false;
        }

        /// <summary>
        /// 嘗試升級爆擊率
        /// </summary>
        public bool UpgradeCrit()
        {
            if (Gold >= CritUpgradeCost && CritChance < 0.80)
            {
                Gold -= CritUpgradeCost;
                CritChance = Math.Min(0.80, CritChance + 0.03);
                CritLevel++;
                return true;
            }
            return false;
        }

        /// <summary>
        /// 嘗試升級爆擊倍率
        /// </summary>
        public bool UpgradeCritMult()
        {
            if (Gold >= CritMultUpgradeCost)
            {
                Gold -= CritMultUpgradeCost;
                CritMultiplier += 0.1;
                CritMultLevel++;
                return true;
            }
            return false;
        }

        /// <summary>
        /// 計算單次攻擊傷害
        /// </summary>
        /// <returns>是否是爆擊</returns>
        public (int damage, bool isCrit) CalculateDamage()
        {
            bool isCrit = new Random().NextDouble() < CritChance;
            int damage = AttackPower;
            if (isCrit) damage = (int)(damage * CritMultiplier);
            return (damage, isCrit);
        }

        /// <summary>
        /// 對怪物造成傷害
        /// </summary>
        public void DamageMonster(int damage)
        {
            MonsterCurrentHp = Math.Max(0, MonsterCurrentHp - damage);
        }

        /// <summary>
        /// 擊殺怪物，獲得金幣
        /// </summary>
        public void KillMonster()
        {
            Gold += GoldReward;
        }

        /// <summary>
        /// 進入下一關
        /// </summary>
        public void NextLevel()
        {
            Level++;
            ResetMonster();
        }
    }
}
