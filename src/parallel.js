// --- 1. 核心数据定义 ---
const rawData = [
    {
        "name": "The Scroll Of Taiwu",
        "year": 2018,
        "original_price": 68.0,
        "favorable_rate": 69.43,
        "total_comments": 61589,
        "max_players": 72533,
        "retention_days": 49,
        "discount_count": 20,
        "avg_discount_rate": 0.08,
        "discount_strength": 43.53,
        "main_tag": "RPG",
        "years_since_release": 7.2
    },
    {
        "name": "Chinese Parents",
        "year": 2018,
        "original_price": 36.0,
        "favorable_rate": 91.42,
        "total_comments": 26306,
        "max_players": 32593,
        "retention_days": 42,
        "discount_count": 20,
        "avg_discount_rate": 0.19,
        "discount_strength": 93.42,
        "main_tag": "Life Sim",
        "years_since_release": 8.2
    },
    {
        "name": "Gujian3(古剑奇谭三)",
        "year": 2018,
        "original_price": 99.0,
        "favorable_rate": 85.97,
        "total_comments": 48555,
        "max_players": 10183,
        "retention_days": 56,
        "discount_count": 5,
        "avg_discount_rate": 0.26,
        "discount_strength": 23.22,
        "main_tag": "RPG",
        "years_since_release": 7.0
    },
    {
        "name": "My Time at Portia",
        "year": 2018,
        "original_price": 98.0,
        "favorable_rate": 91.59,
        "total_comments": 43820,
        "max_players": 13299,
        "retention_days": 238,
        "discount_count": 54,
        "avg_discount_rate": 0.34,
        "discount_strength": 441.75,
        "main_tag": "Life Sim",
        "years_since_release": 8.5
    },
    {
        "name": "PixARK",
        "year": 2018,
        "original_price": 68.0,
        "favorable_rate": 72.96,
        "total_comments": 12835,
        "max_players": 14144,
        "retention_days": 56,
        "discount_count": 10,
        "avg_discount_rate": 0.25,
        "discount_strength": 42.83,
        "main_tag": "Survival",
        "years_since_release": 8.3
    },
    {
        "name": "武侠乂 The Swordsmen X",
        "year": 2018,
        "original_price": 88.0,
        "favorable_rate": 47.24,
        "total_comments": 3529,
        "max_players": 5075,
        "retention_days": 77,
        "discount_count": 36,
        "avg_discount_rate": 0.28,
        "discount_strength": 276.42,
        "main_tag": "Massively Multiplayer",
        "years_since_release": 7.4
    },
    {
        "name": "Ho Tu Lo Shu ： The Books of Dragon",
        "year": 2018,
        "original_price": 88.0,
        "favorable_rate": 81.83,
        "total_comments": 10819,
        "max_players": 1877,
        "retention_days": 189,
        "discount_count": 28,
        "avg_discount_rate": 0.19,
        "discount_strength": 169.26,
        "main_tag": "RPG",
        "years_since_release": 7.1
    },
    {
        "name": "Gunfire Reborn",
        "year": 2020,
        "original_price": 68.0,
        "favorable_rate": 93.27,
        "total_comments": 101753,
        "max_players": 35263,
        "retention_days": 133,
        "discount_count": 10,
        "avg_discount_rate": 0.23,
        "discount_strength": 88.25,
        "main_tag": "Roguelite",
        "years_since_release": 5.6
    },
    {
        "name": "Pascal's Wager: Definitive Edition",
        "year": 2020,
        "original_price": 80.0,
        "favorable_rate": 70.45,
        "total_comments": 1330,
        "max_players": 624,
        "retention_days": 21,
        "discount_count": 23,
        "avg_discount_rate": 0.26,
        "discount_strength": 244.06,
        "main_tag": "Souls-like",
        "years_since_release": 4.8
    },
    {
        "name": "Sands of Salzaar",
        "year": 2020,
        "original_price": 48.0,
        "favorable_rate": 81.86,
        "total_comments": 22806,
        "max_players": 21047,
        "retention_days": 35,
        "discount_count": 20,
        "avg_discount_rate": 0.23,
        "discount_strength": 172.71,
        "main_tag": "Open World",
        "years_since_release": 5.9
    },
    {
        "name": "Neon Abyss",
        "year": 2020,
        "original_price": 58.0,
        "favorable_rate": 86.05,
        "total_comments": 23389,
        "max_players": 6278,
        "retention_days": 49,
        "discount_count": 52,
        "avg_discount_rate": 0.28,
        "discount_strength": 549.5,
        "main_tag": "Roguelike",
        "years_since_release": 5.4
    },
    {
        "name": "港詭實錄ParanormalHK",
        "year": 2020,
        "original_price": 56.0,
        "favorable_rate": 89.68,
        "total_comments": 19629,
        "max_players": 1221,
        "retention_days": 98,
        "discount_count": 43,
        "avg_discount_rate": 0.2,
        "discount_strength": 299.55,
        "main_tag": "Horror",
        "years_since_release": 5.9
    },
    {
        "name": "Biped",
        "year": 2020,
        "original_price": 58.0,
        "favorable_rate": 85.48,
        "total_comments": 10200,
        "max_players": 4961,
        "retention_days": 35,
        "discount_count": 46,
        "avg_discount_rate": 0.28,
        "discount_strength": 469.29,
        "main_tag": "Cartoony",
        "years_since_release": 5.7
    },
    {
        "name": "俠之道(PathOfWuxia)",
        "year": 2020,
        "original_price": 98.0,
        "favorable_rate": 78.33,
        "total_comments": 30290,
        "max_players": 16175,
        "retention_days": 28,
        "discount_count": 1,
        "avg_discount_rate": 0.26,
        "discount_strength": 9.98,
        "main_tag": "RPG",
        "years_since_release": 5.6
    },
    {
        "name": "暖雪 Warm Snow",
        "year": 2022,
        "original_price": 58.0,
        "favorable_rate": 93.07,
        "total_comments": 38003,
        "max_players": 44702,
        "retention_days": 42,
        "discount_count": 31,
        "avg_discount_rate": 0.13,
        "discount_strength": 211.31,
        "main_tag": "Action Roguelike",
        "years_since_release": 3.9
    },
    {
        "name": "My Time at Sandrock",
        "year": 2022,
        "original_price": 98.0,
        "favorable_rate": 88.14,
        "total_comments": 27664,
        "max_players": 21778,
        "retention_days": 28,
        "discount_count": 22,
        "avg_discount_rate": 0.22,
        "discount_strength": 245.57,
        "main_tag": "Life Sim",
        "years_since_release": 3.6
    },
    {
        "name": "Richman 11",
        "year": 2022,
        "original_price": 66.0,
        "favorable_rate": 47.22,
        "total_comments": 2700,
        "max_players": 3258,
        "retention_days": 238,
        "discount_count": 23,
        "avg_discount_rate": 0.19,
        "discount_strength": 250.48,
        "main_tag": "Indie",
        "years_since_release": 3.2
    },
    {
        "name": "《文字遊戲》",
        "year": 2022,
        "original_price": 48.0,
        "favorable_rate": 93.87,
        "total_comments": 6138,
        "max_players": 4105,
        "retention_days": 21,
        "discount_count": 25,
        "avg_discount_rate": 0.1,
        "discount_strength": 123.12,
        "main_tag": "Exploration",
        "years_since_release": 3.9
    },
    {
        "name": "ANNO:Mutationem",
        "year": 2022,
        "original_price": 78.0,
        "favorable_rate": 80.86,
        "total_comments": 6302,
        "max_players": 2938,
        "retention_days": 14,
        "discount_count": 32,
        "avg_discount_rate": 0.2,
        "discount_strength": 334.83,
        "main_tag": "RPG",
        "years_since_release": 3.7
    },
    {
        "name": "奇怪的RPG",
        "year": 2022,
        "original_price": 38.0,
        "favorable_rate": 92.43,
        "total_comments": 4095,
        "max_players": 1160,
        "retention_days": 98,
        "discount_count": 20,
        "avg_discount_rate": 0.19,
        "discount_strength": 265.13,
        "main_tag": "RPG",
        "years_since_release": 3.2
    },
    {
        "name": "太荒初境",
        "year": 2022,
        "original_price": 68.0,
        "favorable_rate": 37.55,
        "total_comments": 13638,
        "max_players": 36315,
        "retention_days": 35,
        "discount_count": 13,
        "avg_discount_rate": 0.32,
        "discount_strength": 218.06,
        "main_tag": "Sandbox",
        "years_since_release": 3.7
    },
    {
        "name": "Black Myth: Wukong",
        "year": 2024,
        "original_price": 268.0,
        "favorable_rate": 96.59,
        "total_comments": 1186287,
        "max_players": 2415714,
        "retention_days": 42,
        "discount_count": 3,
        "avg_discount_rate": 0.08,
        "discount_strength": 26.32,
        "main_tag": "Mythology",
        "years_since_release": 1.5
    },
    {
        "name": "The Hungry Lamb: Traveling in the Late Ming Dynasty",
        "year": 2024,
        "original_price": 37.0,
        "favorable_rate": 94.93,
        "total_comments": 56660,
        "max_players": 5093,
        "retention_days": 161,
        "discount_count": 12,
        "avg_discount_rate": 0.12,
        "discount_strength": 177.46,
        "main_tag": "Visual Novel",
        "years_since_release": 1.6
    },
    {
        "name": "Soulmask",
        "year": 2024,
        "original_price": 108.0,
        "favorable_rate": 80.63,
        "total_comments": 16775,
        "max_players": 46833,
        "retention_days": 84,
        "discount_count": 15,
        "avg_discount_rate": 0.13,
        "discount_strength": 228.36,
        "main_tag": "Survival",
        "years_since_release": 1.5
    },
    {
        "name": "Murders on the Yangtze River",
        "year": 2024,
        "original_price": 58.0,
        "favorable_rate": 97.21,
        "total_comments": 19715,
        "max_players": 4964,
        "retention_days": 105,
        "discount_count": 16,
        "avg_discount_rate": 0.13,
        "discount_strength": 224.28,
        "main_tag": "Detective",
        "years_since_release": 1.9
    },
    {
        "name": "中国式网游",
        "year": 2024,
        "original_price": 32.0,
        "favorable_rate": 86.0,
        "total_comments": 10167,
        "max_players": 12301,
        "retention_days": 21,
        "discount_count": 11,
        "avg_discount_rate": 0.1,
        "discount_strength": 156.33,
        "main_tag": "CRPG",
        "years_since_release": 1.4
    },
    {
        "name": "Feed The Cups",
        "year": 2024,
        "original_price": 58.0,
        "favorable_rate": 31.68,
        "total_comments": 13929,
        "max_players": 11413,
        "retention_days": 620,
        "discount_count": 9,
        "avg_discount_rate": 0.06,
        "discount_strength": 66.11,
        "main_tag": "Cute",
        "years_since_release": 1.8
    },
    {
        "name": "Lost Castle 2",
        "year": 2024,
        "original_price": 53.0,
        "favorable_rate": 79.74,
        "total_comments": 10033,
        "max_players": 20280,
        "retention_days": 42,
        "discount_count": 11,
        "avg_discount_rate": 0.05,
        "discount_strength": 86.28,
        "main_tag": "Multiplayer",
        "years_since_release": 1.4
    },
    {
        "name": "艾希 (ICEY)",
        "year": 2017,
        "original_price": 38.0,
        "favorable_rate": 88.07,
        "total_comments": 27362,
        "max_players": 3173,
        "retention_days": 14,
        "discount_count": 12,
        "avg_discount_rate": 0.22,
        "discount_strength": 55.75,
        "main_tag": "Action",
        "years_since_release": 9.1
    },
    {
        "name": "失落城堡 (Lost Castle)",
        "year": 2017,
        "original_price": 33.0,
        "favorable_rate": 84.96,
        "total_comments": 23687,
        "max_players": 4652,
        "retention_days": 1295,
        "discount_count": 24,
        "avg_discount_rate": 0.27,
        "discount_strength": 121.89,
        "main_tag": "Action",
        "years_since_release": 9.9
    },
    {
        "name": "古剑奇谭二 (GuJian2)",
        "year": 2017,
        "original_price": 49.0,
        "favorable_rate": 74.88,
        "total_comments": 2941,
        "max_players": 563,
        "retention_days": 168,
        "discount_count": 13,
        "avg_discount_rate": 0.31,
        "discount_strength": 98.49,
        "main_tag": "RPG",
        "years_since_release": 8.4
    },
    {
        "name": "三色绘恋 (Tricolour Lovestory)",
        "year": 2017,
        "original_price": 11.0,
        "favorable_rate": 80.1,
        "total_comments": 27995,
        "max_players": 2733,
        "retention_days": 112,
        "discount_count": 76,
        "avg_discount_rate": 0.33,
        "discount_strength": 601.81,
        "main_tag": "Visual Novel",
        "years_since_release": 8.3
    },
    {
        "name": "古剑奇谭 (GuJian)",
        "year": 2017,
        "original_price": 39.0,
        "favorable_rate": 77.8,
        "total_comments": 5555,
        "max_players": 1782,
        "retention_days": 49,
        "discount_count": 16,
        "avg_discount_rate": 0.33,
        "discount_strength": 126.52,
        "main_tag": "RPG",
        "years_since_release": 8.3
    },
    {
        "name": "返校 (Detention)",
        "year": 2017,
        "original_price": 38.0,
        "favorable_rate": 80.42,
        "total_comments": 14624,
        "max_players": 2287,
        "retention_days": 28,
        "discount_count": 13,
        "avg_discount_rate": 0.27,
        "discount_strength": 61.46,
        "main_tag": "Horror",
        "years_since_release": 9.1
    },
    {
        "name": "黑暗与光明 (Dark and Light)",
        "year": 2017,
        "original_price": 52.0,
        "favorable_rate": 52.11,
        "total_comments": 11778,
        "max_players": 14089,
        "retention_days": 105,
        "discount_count": 25,
        "avg_discount_rate": 0.46,
        "discount_strength": 143.32,
        "main_tag": "Open World",
        "years_since_release": 9.0
    },
    {
        "name": "隐形守护者",
        "year": 2019,
        "original_price": 28.0,
        "favorable_rate": 85.46,
        "total_comments": 51655,
        "max_players": 82345,
        "retention_days": 14,
        "discount_count": 23,
        "avg_discount_rate": 0.22,
        "discount_strength": 147.65,
        "main_tag": "RPG",
        "years_since_release": 6.9
    },
    {
        "name": "探灵笔记",
        "year": 2019,
        "original_price": 26.0,
        "favorable_rate": 75.89,
        "total_comments": 20404,
        "max_players": 2968,
        "retention_days": 847,
        "discount_count": 27,
        "avg_discount_rate": 0.2,
        "discount_strength": 150.2,
        "main_tag": "Horror",
        "years_since_release": 6.9
    },
    {
        "name": "了不起的修仙模拟器",
        "year": 2019,
        "original_price": 88.0,
        "favorable_rate": 83.95,
        "total_comments": 23431,
        "max_players": 18349,
        "retention_days": 49,
        "discount_count": 19,
        "avg_discount_rate": 0.15,
        "discount_strength": 87.97,
        "main_tag": "Simulation",
        "years_since_release": 6.9
    },
    {
        "name": "疑案追声",
        "year": 2019,
        "original_price": 38.0,
        "favorable_rate": 94.13,
        "total_comments": 32238,
        "max_players": 7754,
        "retention_days": 14,
        "discount_count": 56,
        "avg_discount_rate": 0.25,
        "discount_strength": 436.94,
        "main_tag": "Detective",
        "years_since_release": 6.7
    },
    {
        "name": "光明记忆",
        "year": 2019,
        "original_price": 29.0,
        "favorable_rate": 88.5,
        "total_comments": 39283,
        "max_players": 1907,
        "retention_days": 21,
        "discount_count": 18,
        "avg_discount_rate": 0.2,
        "discount_strength": 134.07,
        "main_tag": "Female Protagonist",
        "years_since_release": 6.9
    },
    {
        "name": "嗜血印",
        "year": 2019,
        "original_price": 79.0,
        "favorable_rate": 87.88,
        "total_comments": 38087,
        "max_players": 7267,
        "retention_days": 21,
        "discount_count": 21,
        "avg_discount_rate": 0.39,
        "discount_strength": 230.48,
        "main_tag": "Nudity",
        "years_since_release": 6.9
    },
    {
        "name": "硬核机甲",
        "year": 2019,
        "original_price": 80.0,
        "favorable_rate": 79.97,
        "total_comments": 2649,
        "max_players": 1770,
        "retention_days": 21,
        "discount_count": 44,
        "avg_discount_rate": 0.25,
        "discount_strength": 278.5,
        "main_tag": "Action",
        "years_since_release": 8.1
    },
    {
        "name": "永劫无间 (NARAKA: BLADEPOINT)",
        "year": 2021,
        "original_price": 0.0,
        "favorable_rate": 68.81,
        "total_comments": 336077,
        "max_players": 385770,
        "retention_days": 495,
        "discount_count": 0,
        "avg_discount_rate": 0.0,
        "discount_strength": 0.0,
        "main_tag": "Battle Royale",
        "years_since_release": 4.5
    },
    {
        "name": "鬼谷八荒 (Tale of Immortal)",
        "year": 2021,
        "original_price": 68.0,
        "favorable_rate": 54.05,
        "total_comments": 226599,
        "max_players": 184171,
        "retention_days": 84,
        "discount_count": 16,
        "avg_discount_rate": 0.12,
        "discount_strength": 81.94,
        "main_tag": "Management",
        "years_since_release": 4.9
    },
    {
        "name": "戴森球计划 (Dyson Sphere Program)",
        "year": 2021,
        "original_price": 70.0,
        "favorable_rate": 96.03,
        "total_comments": 88259,
        "max_players": 59815,
        "retention_days": 217,
        "discount_count": 31,
        "avg_discount_rate": 0.09,
        "discount_strength": 112.29,
        "main_tag": "Automation",
        "years_since_release": 4.9
    },
    {
        "name": "风来之国 (Eastward)",
        "year": 2021,
        "original_price": 80.0,
        "favorable_rate": 82.16,
        "total_comments": 16202,
        "max_players": 13882,
        "retention_days": 21,
        "discount_count": 24,
        "avg_discount_rate": 0.22,
        "discount_strength": 249.12,
        "main_tag": "Pixel Graphics",
        "years_since_release": 4.3
    },
    {
        "name": "古网海外版 (Swords of Legends Online)",
        "year": 2021,
        "original_price": 0.0,
        "favorable_rate": 65.4,
        "total_comments": 5819,
        "max_players": 18806,
        "retention_days": 77,
        "discount_count": 0,
        "avg_discount_rate": 0.0,
        "discount_strength": 0.0,
        "main_tag": "Free to Play",
        "years_since_release": 4.7
    },
    {
        "name": "笼中窥梦 (Moncage)",
        "year": 2021,
        "original_price": 48.0,
        "favorable_rate": 89.3,
        "total_comments": 5436,
        "max_players": 1965,
        "retention_days": 21,
        "discount_count": 27,
        "avg_discount_rate": 0.14,
        "discount_strength": 186.3,
        "main_tag": "Puzzle",
        "years_since_release": 4.1
    },
    {
        "name": "仙剑奇侠传七 (Sword and Fairy 7)",
        "year": 2021,
        "original_price": 128.0,
        "favorable_rate": 71.14,
        "total_comments": 18800,
        "max_players": 15245,
        "retention_days": 35,
        "discount_count": 41,
        "avg_discount_rate": 0.22,
        "discount_strength": 400.45,
        "main_tag": "RPG",
        "years_since_release": 4.1
    },
    {
        "name": "猛兽派对 (Party Animals)",
        "year": 2023,
        "original_price": 98.0,
        "favorable_rate": 78.55,
        "total_comments": 73171,
        "max_players": 104174,
        "retention_days": 49,
        "discount_count": 7,
        "avg_discount_rate": 0.19,
        "discount_strength": 95.09,
        "main_tag": "Multiplayer",
        "years_since_release": 2.3
    },
    {
        "name": "完蛋！我被美女包围了！ (Love Is All Around)",
        "year": 2023,
        "original_price": 42.0,
        "favorable_rate": 91.63,
        "total_comments": 45787,
        "max_players": 65435,
        "retention_days": 35,
        "discount_count": 17,
        "avg_discount_rate": 0.11,
        "discount_strength": 180.54,
        "main_tag": "Dating Sim",
        "years_since_release": 2.2
    },
    {
        "name": "火山的女儿 (Volcano Princess)",
        "year": 2023,
        "original_price": 35.0,
        "favorable_rate": 95.93,
        "total_comments": 45796,
        "max_players": 31057,
        "retention_days": 35,
        "discount_count": 24,
        "avg_discount_rate": 0.13,
        "discount_strength": 199.4,
        "main_tag": "Life Sim",
        "years_since_release": 2.7
    },
    {
        "name": "大侠立志传：碧血丹心 (Hero's Adventure: Road to Passion)",
        "year": 2023,
        "original_price": 69.0,
        "favorable_rate": 82.85,
        "total_comments": 23586,
        "max_players": 28936,
        "retention_days": 42,
        "discount_count": 21,
        "avg_discount_rate": 0.15,
        "discount_strength": 227.52,
        "main_tag": "RPG",
        "years_since_release": 2.8
    },
    {
        "name": "无人生还 (No One Survived)",
        "year": 2023,
        "original_price": 68.0,
        "favorable_rate": 64.53,
        "total_comments": 7359,
        "max_players": 4632,
        "retention_days": 126,
        "discount_count": 13,
        "avg_discount_rate": 0.2,
        "discount_strength": 183.65,
        "main_tag": "Survival",
        "years_since_release": 2.9
    },
    {
        "name": "逸剑风云决 (Wandering Sword)",
        "year": 2023,
        "original_price": 78.0,
        "favorable_rate": 93.06,
        "total_comments": 38409,
        "max_players": 22824,
        "retention_days": 63,
        "discount_count": 21,
        "avg_discount_rate": 0.08,
        "discount_strength": 143.52,
        "main_tag": "RPG",
        "years_since_release": 2.3
    },
    {
        "name": "飞越13号房 (Breakout 13)",
        "year": 2023,
        "original_price": 32.0,
        "favorable_rate": 85.36,
        "total_comments": 7326,
        "max_players": 11996,
        "retention_days": 14,
        "discount_count": 15,
        "avg_discount_rate": 0.16,
        "discount_strength": 169.5,
        "main_tag": "FMV",
        "years_since_release": 2.9
    }
];

const tagData = {
    "name": "root",
    "children": [
        { "name": "角色扮演", "value": 1975.17, "game_count": 46, "detail_tags": ["RPG", "Action RPG", "Character Customization", "Turn-Based", "JRPG", "CRPG", "Loot", "Turn-Based Combat"] },
        { "name": "动作格斗", "value": 1651.17, "game_count": 41, "detail_tags": ["Action", "Martial Arts", "Action-Adventure", "Hack and Slash", "Violent", "Gore", "Combat", "Fighting"] },
        { "name": "剧情叙事", "value": 1427.55, "game_count": 34, "detail_tags": ["Story Rich", "Drama", "Dating Sim", "Multiple Endings", "Visual Novel", "Choices Matter", "Choose Your Own Adventure", "Romance"] },
        { "name": "生存开放", "value": 1324.88, "game_count": 32, "detail_tags": ["Open World", "Sandbox", "Survival", "Exploration", "Crafting", "Open World Survival Craft", "Immersive Sim", "Mining"] },
        { "name": "休闲治愈", "value": 1311.47, "game_count": 30, "detail_tags": ["Casual", "Atmospheric", "Funny", "Cute", "Relaxing", "Cartoony", "Family Friendly", "Memes"] },
        { "name": "射击弹幕", "value": 1014.78, "game_count": 24, "detail_tags": ["Third Person", "FPS", "Shooter", "Top-Down", "Looter Shooter", "Bullet Hell", "3D Vision"] },
        { "name": "模拟建造", "value": 982.91, "game_count": 23, "detail_tags": ["Simulation", "Building", "Life Sim", "Base Building", "Management", "Farming Sim", "Time Management", "Cooking"] },
        { "name": "多人竞技", "value": 976.49, "game_count": 24, "detail_tags": ["Multiplayer", "Online Co-Op", "Co-op", "Massively Multiplayer", "PvP", "Local Co-Op", "Local Multiplayer", "Battle Royale"] },
        { "name": "奇幻神话", "value": 825.53, "game_count": 19, "detail_tags": ["Fantasy", "Mythology", "Magic", "Historical", "Medieval", "Dragons"] },
        { "name": "肉鸽挑战", "value": 725.13, "game_count": 17, "detail_tags": ["Roguelite", "Roguelike", "Action Roguelike", "Souls-like", "Dungeon Crawler", "Replay Value", "Difficult", "Procedural Generation"] },
        { "name": "策略战棋", "value": 690.37, "game_count": 16, "detail_tags": ["Strategy", "RTS", "Turn-Based Strategy", "War", "Real Time Tactics", "Tower Defense", "Military", "Tactical"] },
        { "name": "恐怖悬疑", "value": 596.64, "game_count": 14, "detail_tags": ["Psychological Horror", "Horror", "Survival Horror", "Dark", "Dark Fantasy", "Thriller", "Lovecraftian", "Zombies"] },
        { "name": "平台银河城", "value": 458.11, "game_count": 11, "detail_tags": ["Platformer", "2D Platformer", "2.5D", "3D Platformer", "Side Scroller", "Metroidvania", "Parkour"] },
        { "name": "解谜探案", "value": 403.75, "game_count": 10, "detail_tags": ["Puzzle", "Puzzle Platformer", "Mystery", "Detective", "Point & Click", "Logic", "Investigation"] },
        { "name": "科幻机甲", "value": 400.84, "game_count": 10, "detail_tags": ["Sci-fi", "Post-apocalyptic", "Cyberpunk", "Futuristic", "Mechs", "Space", "Space Sim"] },
        { "name": "卡牌构建", "value": 54.69, "game_count": 1, "detail_tags": ["Deckbuilding"] }
    ]
};

// --- 2. 数据预处理与全局变量 ---
const currentYear = 2025;
let data = [];
if (rawData && rawData.length > 0) {
    data = rawData.map(d => ({
        ...d,
        log_players: Math.log10(d.max_players < 1 ? 1 : d.max_players),
        discount_strength: (d.discount_count * (d.avg_discount_rate * 100)) / Math.max(0.1, currentYear - d.year)
    }));
}

const nameMap = {
    "year": "年份",
    "original_price": "售价 (¥)",
    "discount_strength": "折扣力度",
    "favorable_rate": "好评率 (%)",
    "log_players": "在线人数 (10^x)",
    "retention_days": "留存天数 (Days)"
};

// --- 3. UI 交互功能 ---
const yearSelect = document.getElementById('selectYear');
if (data.length > 0) {
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.innerText = year;
        yearSelect.appendChild(opt);
    });
}

function showTooltip(event, content) {
    const tooltip = d3.select("#tooltip");
    tooltip.html(content).style("opacity", 1);
    const tooltipNode = tooltip.node();
    const tipWidth = tooltipNode.offsetWidth;
    const tipHeight = tooltipNode.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let left = event.pageX + 15;
    let top = event.pageY + 15;
    if (left + tipWidth > windowWidth) left = event.pageX - tipWidth - 15;
    if (event.clientY + tipHeight + 20 > windowHeight) top = event.pageY - tipHeight - 15;
    tooltip.style("left", left + "px").style("top", top + "px");
}

function calculateCorrelation(xArray, yArray) {
    const n = xArray.length;
    if (n <= 1) return 0;
    const sumX = d3.sum(xArray), sumY = d3.sum(yArray);
    const meanX = sumX / n, meanY = sumY / n;
    let numerator = 0, denominatorX = 0, denominatorY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xArray[i] - meanX, dy = yArray[i] - meanY;
        numerator += dx * dy;
        denominatorX += dx * dx;
        denominatorY += dy * dy;
    }
    const denominator = Math.sqrt(denominatorX * denominatorY);
    return denominator === 0 ? 0 : numerator / denominator;
}

// --- 4. 绘图函数 ---

// 主图：平行坐标图
function drawParallelPlot() {
    if (data.length === 0) return;
    const dimensions = [
        { key: "year", name: "年份" },
        { key: "original_price", name: "售价" },
        { key: "discount_strength", name: "折扣力度" },
        { key: "favorable_rate", name: "好评率" },
        { key: "log_players", name: "在线(10^x)" },
        { key: "retention_days", name: "留存" }
    ];

    const container = document.getElementById('main-chart-container');
    const width = container.clientWidth - 120;
    const height = container.clientHeight - 60;
    const margin = { top: 40, right: 60, bottom: 20, left: 60 };

    container.innerHTML = "";

    const svg = d3.select("#main-chart-container").append("svg")
        .attr("width", container.clientWidth)
        .attr("height", container.clientHeight)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().range([0, width]).padding(0).domain(dimensions.map(d => d.key));
    const y = {};
    dimensions.forEach(dim => {
        if (dim.key === 'log_players') y[dim.key] = d3.scaleLinear().domain([2, 7]).range([height, 0]);
        else if (dim.key === 'favorable_rate') y[dim.key] = d3.scaleLinear().domain([30, 100]).range([height, 0]);
        else y[dim.key] = d3.scaleLinear().domain(d3.extent(data, d => d[dim.key])).range([height, 0]);
    });

    const colorScale = d3.scaleSequential().domain([100, 40]).interpolator(d3.interpolateTurbo);
    const line = d3.line().defined(d => !isNaN(d[1])).x(d => x(d[0])).y(d => y[d[0]](d[1]));

    const pathGroup = svg.append("g");
    const paths = pathGroup.selectAll("path")
        .data(data).enter().append("path")
        .attr("class", "line")
        .attr("d", d => line(dimensions.map(p => [p.key, d[p.key]])))
        .style("stroke", d => colorScale(d.favorable_rate))
        .style("stroke-opacity", 0.6)
        .style("stroke-width", 1.5);

    svg.selectAll("myAxis").data(dimensions).enter().append("g")
        .attr("class", "axis").attr("transform", d => `translate(${x(d.key)})`)
        .each(function (d) {
            const axis = d3.axisLeft(y[d.key]);
            if (d.key === 'year') axis.tickFormat(d3.format("d"));
            d3.select(this).call(axis);
        })
        .append("text").style("text-anchor", "middle").attr("y", -15).attr("class", "axis-title").text(d => d.name);

    window.updateParallelChart = function (searchVal, yearVal) {
        const isFiltered = (searchVal !== "") || (yearVal !== "");
        paths.each(function (d) {
            const match = (!searchVal || d.name.toLowerCase().includes(searchVal.toLowerCase())) &&
                (!yearVal || d.year == yearVal);
            const el = d3.select(this);
            el.classed("highlight", false);
            if (!isFiltered) {
                el.classed("active", false).classed("inactive", false)
                    .style("stroke-opacity", 0.6).style("stroke-width", 1.5).style("stroke", colorScale(d.favorable_rate));
            } else {
                if (match) {
                    el.classed("active", true).classed("inactive", false)
                        .style("stroke-opacity", 1).style("stroke-width", 3).style("stroke", colorScale(d.favorable_rate));
                    el.raise();
                } else {
                    el.classed("active", false).classed("inactive", true)
                        .style("stroke-opacity", 0.05).style("stroke-width", 1).style("stroke", "#555");
                }
            }
        });
    };

    paths.on("mouseover", function (event, d) {
        if (d3.select(this).classed("inactive")) return;
        d3.select(this).classed("highlight", true).raise();
        const content = `
            <div class="tooltip-title">${d.name}</div>
            <div class="tooltip-row"><span>年份:</span> <b>${d.year}</b></div>
            <div class="tooltip-row"><span>好评率:</span> <b>${d.favorable_rate}%</b></div>
            <div class="tooltip-row"><span>售价:</span> <b>¥${d.original_price}</b></div>
            <div class="tooltip-row"><span>在线人数:</span> <b>${d.max_players}</b></div>
        `;
        showTooltip(event, content);
    })
        .on("mouseout", function () {
            const sVal = document.getElementById('searchName').value;
            const yVal = document.getElementById('selectYear').value;
            window.updateParallelChart(sVal, yVal);
            d3.select("#tooltip").style("opacity", 0);
        });
}

// 标签气泡图
function drawTagBubbleChart() {
    if (!tagData) return;
    const container = document.getElementById('tag-viz');
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight;
    const svg = d3.select("#tag-viz").append("svg").attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`).style("display", "block").style("margin", "0 auto");

    const root = d3.hierarchy(tagData).sum(d => Math.pow(d.value, 0.6)).sort((a, b) => b.value - a.value);
    const pack = d3.pack().size([width, height]).padding(3);
    pack(root);
    const color = d3.scaleSequential([0, root.children.length], d3.interpolateMagma);
    const nodes = svg.selectAll("g").data(root.leaves()).join("g").attr("transform", d => `translate(${d.x},${d.y})`).attr("class", "node-group");

    nodes.append("circle").attr("r", d => d.r).attr("class", "bubble").style("fill", (d, i) => color(i)).style("fill-opacity", 0.8).style("stroke", "#000").style("stroke-width", 1);

    nodes.append("text").attr("class", "bubble-text main-label").attr("y", -2).text(d => d.data.name)
        .style("font-size", d => Math.max(8, Math.min(d.r / 2.2, 16)) + "px").style("opacity", d => d.r > 10 ? 1 : 0)
        .style("pointer-events", "none").style("text-anchor", "middle").style("fill", "#fff").style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)").style("font-weight", "bold");

    nodes.append("text").attr("class", "bubble-subtext sub-label").attr("y", d => d.r / 2.2 + 4).text(d => Math.round(d.data.value))
        .style("font-size", d => Math.max(7, Math.min(d.r / 3, 10)) + "px").style("opacity", d => d.r > 12 ? 0.8 : 0)
        .style("pointer-events", "none").style("text-anchor", "middle").style("fill", "#ddd");

    nodes.on("mouseover", function (event, d) {
        const group = d3.select(this);
        group.raise();
        group.select("circle").transition().duration(200).attr("r", d.r * 1.3).style("stroke", "#fff").style("stroke-width", 2).style("fill-opacity", 1);
        group.selectAll("text").transition().duration(200).style("opacity", 1).style("font-size", function () { return d3.select(this).classed("main-label") ? "14px" : "10px"; });
        let tagsHtml = "";
        if (d.data.detail_tags) tagsHtml = d.data.detail_tags.map(t => `<span class="tag-pill">${t}</span>`).join("");
        const content = `<div class="tooltip-title">${d.data.name}</div><div class="tooltip-row"><span>综合热度:</span> <b>${Math.round(d.data.value)}</b></div><div class="tooltip-row"><span>关联游戏数:</span> <b>${d.data.game_count}</b></div><div style="margin-top:8px; border-top:1px solid #333; paddingTop:4px;"><div style="color:#aaa; font-size:10px;">包含 Tags:</div><div style="white-space:normal; max-width:200px;">${tagsHtml}</div></div>`;
        showTooltip(event, content);
    }).on("mouseout", function (event, d) {
        const group = d3.select(this);
        group.select("circle").transition().duration(200).attr("r", d.r).style("stroke", "#000").style("stroke-width", 1).style("fill-opacity", 0.8);
        group.select(".main-label").transition().duration(200).style("font-size", Math.max(8, Math.min(d.r / 2.2, 16)) + "px").style("opacity", d.r > 10 ? 1 : 0);
        group.select(".sub-label").transition().duration(200).style("font-size", Math.max(7, Math.min(d.r / 3, 10)) + "px").style("opacity", d.r > 12 ? 0.8 : 0);
        d3.select("#tooltip").style("opacity", 0);
    });
}

// 条形图：影响因子分析
function drawBarChart(targetKey) {
    if (data.length === 0) return;
    const container = document.getElementById('bar-viz');
    container.innerHTML = "";

    const features = [{ key: 'year', name: '年份' }, { key: 'original_price', name: '售价' }, { key: 'discount_strength', name: '折扣' }];
    const chartData = features.map(f => ({ feature: f.name, value: calculateCorrelation(data.map(d => d[f.key]), data.map(d => d[targetKey])) }));

    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    const svg = d3.select("#bar-viz").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([-1, 1]).range([0, innerW]);
    const y = d3.scaleBand().range([0, innerH]).domain(chartData.map(d => d.feature)).padding(0.4);

    svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", innerH).attr("stroke", "#555").attr("stroke-dasharray", "4");
    svg.selectAll("rect").data(chartData).enter().append("rect").attr("x", d => x(Math.min(0, d.value))).attr("y", d => y(d.feature)).attr("width", d => Math.abs(x(d.value) - x(0))).attr("height", y.bandwidth()).attr("fill", d => d.value > 0 ? "#ff4d4d" : "#00d4ff").attr("rx", 4);
    svg.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
    svg.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5));
    svg.selectAll(".val-label").data(chartData).enter().append("text").attr("x", d => d.value > 0 ? x(d.value) + 5 : x(d.value) - 5).attr("y", d => y(d.feature) + y.bandwidth() / 2 + 4).attr("text-anchor", d => d.value > 0 ? "start" : "end").text(d => d.value.toFixed(2)).style("fill", "#fff").style("font-size", "11px");
}

// 热力图：变量相关性
function drawHeatmap() {
    if (data.length === 0) return;
    const container = document.getElementById('heatmap-viz');
    container.innerHTML = "";

    const features = ['year', 'original_price', 'discount_strength', 'favorable_rate', 'log_players', 'retention_days'];
    const labels = ['年份', '售价', '折扣', '好评', '在线', '留存'];
    const heatmapData = [];
    features.forEach((rowFeat, i) => {
        features.forEach((colFeat, j) => {
            heatmapData.push({ x: j, y: i, value: calculateCorrelation(data.map(d => d[rowFeat]), data.map(d => d[colFeat])) });
        });
    });

    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 10, bottom: 40, left: 40 };

    const svg = d3.select("#heatmap-viz").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const x = d3.scaleBand().range([0, innerW]).domain(d3.range(features.length)).padding(0.05);
    const y = d3.scaleBand().range([0, innerH]).domain(d3.range(features.length)).padding(0.05);
    const color = d3.scaleLinear().domain([-1, 0, 1]).range(["#00d4ff", "#1a1a1a", "#ff4d4d"]);

    svg.selectAll().data(heatmapData).enter().append("rect").attr("x", d => x(d.x)).attr("y", d => y(d.y)).attr("width", x.bandwidth()).attr("height", y.bandwidth()).style("fill", d => color(d.value))
        .on("mouseover", function (event, d) { d3.select(this).style("stroke", "#fff").style("stroke-width", 2); showTooltip(event, `${labels[d.x]} vs ${labels[d.y]}<br>R = <b>${d.value.toFixed(2)}</b>`); })
        .on("mouseout", function () { d3.select("#tooltip").style("opacity", 0); d3.select(this).style("stroke", "none"); });
    svg.append("g").call(d3.axisLeft(y).tickFormat(i => labels[i])).select(".domain").remove();
    svg.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickFormat(i => labels[i])).select(".domain").remove();
}

// 散点图
function drawScatterChart(xKey, yKey) {
    if (data.length === 0) return;
    const container = document.getElementById('scatter-viz');
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    const svg = d3.select("#scatter-viz").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xExtent = d3.extent(data, d => d[xKey]), yExtent = d3.extent(data, d => d[yKey]);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1 || 1, yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 1;

    const x = d3.scaleLinear().domain([xExtent[0] - xPadding, xExtent[1] + xPadding]).range([0, innerW]);
    const y = d3.scaleLinear().domain([yExtent[0] - yPadding, yExtent[1] + yPadding]).range([innerH, 0]);

    const xAxis = d3.axisBottom(x).ticks(5);
    if (xKey === 'year') xAxis.tickFormat(d3.format("d"));

    svg.append("g").attr("transform", `translate(0,${innerH})`).call(xAxis);
    svg.append("g").call(d3.axisLeft(y).ticks(5));
    svg.append("text").attr("x", innerW / 2).attr("y", innerH + 35).style("text-anchor", "middle").style("fill", "#aaa").style("font-size", "12px").text(nameMap[xKey] || xKey);
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -35).attr("x", -innerH / 2).style("text-anchor", "middle").style("fill", "#aaa").style("font-size", "12px").text(nameMap[yKey] || yKey);

    const colorScale = d3.scaleSequential().domain([40, 100]).interpolator(d3.interpolateTurbo);
    svg.selectAll("circle").data(data).enter().append("circle").attr("class", "dot").attr("cx", d => x(d[xKey])).attr("cy", d => y(d[yKey])).attr("r", 4).style("fill", d => colorScale(d.favorable_rate))
        .on("mouseover", function (event, d) {
            d3.select(this).attr("r", 7).style("stroke", "#fff").style("stroke-width", 2);
            const content = `<div class="tooltip-title">${d.name}</div><div class="tooltip-row"><span>${nameMap[xKey]}:</span> <b>${d[xKey]}</b></div><div class="tooltip-row"><span>${nameMap[yKey]}:</span> <b>${d[yKey]}</b></div>`;
            showTooltip(event, content);
        })
        .on("mouseout", function () { d3.select("#tooltip").style("opacity", 0); d3.select(this).attr("r", 4).style("stroke", "#000").style("stroke-width", 1); });
}

// --- 5. 初始化与事件监听 ---
function init() {
    if (data.length > 0) {
        drawParallelPlot();
        drawHeatmap();
        drawBarChart(document.getElementById('targetSelect').value);
        drawScatterChart(document.getElementById('scatterX').value, document.getElementById('scatterY').value);
    }
    drawTagBubbleChart();
}

// 启动初始化
init();

// 窗口自适应
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(init, 100);
});

// 搜索监听
document.getElementById('searchName').addEventListener('input', function () {
    window.updateParallelChart(this.value, document.getElementById('selectYear').value);
});

// 年份选择监听
document.getElementById('selectYear').addEventListener('change', function () {
    window.updateParallelChart(document.getElementById('searchName').value, this.value);
});

// 属性分析目标切换监听
document.getElementById('targetSelect').addEventListener('change', function () {
    drawBarChart(this.value);
});

// 散点图轴切换监听
function updateScatter() {
    drawScatterChart(document.getElementById('scatterX').value, document.getElementById('scatterY').value);
}
document.getElementById('scatterX').addEventListener('change', updateScatter);
document.getElementById('scatterY').addEventListener('change', updateScatter);

// 重置滤镜
window.resetFilters = function () {
    document.getElementById('searchName').value = '';
    document.getElementById('selectYear').value = '';
    window.updateParallelChart("", "");
};