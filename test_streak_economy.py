import unittest
import json
import sqlite3
import jwt
from datetime import datetime, timedelta
from app import app, init_db, get_db, process_gameplay_log

class TestStreakEconomyAndBlackMarket(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.secret = 'trashmaster_super_secret_key_1234567890_jwt_secure'
        with app.app_context():
            init_db()

    def create_test_user(self, username='test_player_streak'):
        with app.app_context():
            db = get_db()
            db.execute('DELETE FROM users WHERE username = ?', (username,))
            db.execute('INSERT INTO users (username, password_hash, role, balance, lids, current_streak, max_streak, streak_qualified) VALUES (?, "hash", "player", 1000, 0, 0, 0, 0)', (username,))
            db.commit()
            cursor = db.cursor()
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            user_id = cursor.fetchone()['id']
            db.execute('DELETE FROM gameplay_logs WHERE user_id = ?', (user_id,))
            db.execute('DELETE FROM inventory WHERE user_id = ?', (user_id,))
            db.execute('DELETE FROM black_market_transactions WHERE user_id = ?', (user_id,))
            db.commit()
            return user_id

    def get_auth_headers(self, user_id, username):
        token = jwt.encode({'user_id': user_id, 'username': username}, self.secret, algorithm='HS256')
        return {'Authorization': f'Bearer {token}'}

    def test_7_day_streak_retroactive_payout_and_ongoing(self):
        with app.app_context():
            db = get_db()
            user_id = self.create_test_user('streak_tester_1')

            base_date = datetime(2026, 8, 1)

            # Day 1: 2 games played -> locked (0 lids)
            day1_str = (base_date + timedelta(days=0)).strftime('%Y-%m-%d')
            res1 = process_gameplay_log(db, user_id, date_override=day1_str, round_num=1)
            self.assertEqual(res1['current_streak'], 1)
            self.assertEqual(res1['lids_awarded'], 0)
            self.assertEqual(res1['total_lids'], 0)
            self.assertFalse(res1['retroactive_payout'])

            res1_b = process_gameplay_log(db, user_id, date_override=day1_str, round_num=2)
            self.assertEqual(res1_b['current_streak'], 1)
            self.assertEqual(res1_b['lids_awarded'], 0)
            self.assertEqual(res1_b['total_lids'], 0)

            # Days 2 through 6: consecutive play
            # Day 2: 1 game
            day2_str = (base_date + timedelta(days=1)).strftime('%Y-%m-%d')
            res2 = process_gameplay_log(db, user_id, date_override=day2_str, round_num=3)
            self.assertEqual(res2['current_streak'], 2)
            self.assertEqual(res2['lids_awarded'], 0)

            # Day 3: 3 games
            day3_str = (base_date + timedelta(days=2)).strftime('%Y-%m-%d')
            process_gameplay_log(db, user_id, date_override=day3_str, round_num=4)
            process_gameplay_log(db, user_id, date_override=day3_str, round_num=5)
            res3 = process_gameplay_log(db, user_id, date_override=day3_str, round_num=6)
            self.assertEqual(res3['current_streak'], 3)
            self.assertEqual(res3['lids_awarded'], 0)

            # Day 4: 1 game
            day4_str = (base_date + timedelta(days=3)).strftime('%Y-%m-%d')
            res4 = process_gameplay_log(db, user_id, date_override=day4_str, round_num=7)
            self.assertEqual(res4['current_streak'], 4)
            self.assertEqual(res4['lids_awarded'], 0)

            # Day 5: 2 games
            day5_str = (base_date + timedelta(days=4)).strftime('%Y-%m-%d')
            process_gameplay_log(db, user_id, date_override=day5_str, round_num=8)
            res5 = process_gameplay_log(db, user_id, date_override=day5_str, round_num=9)
            self.assertEqual(res5['current_streak'], 5)
            self.assertEqual(res5['lids_awarded'], 0)

            # Day 6: 1 game
            day6_str = (base_date + timedelta(days=5)).strftime('%Y-%m-%d')
            res6 = process_gameplay_log(db, user_id, date_override=day6_str, round_num=10)
            self.assertEqual(res6['current_streak'], 6)
            self.assertEqual(res6['lids_awarded'], 0)
            self.assertEqual(res6['total_lids'], 0)

            # Day 7: Game 1 is played -> Retroactive Payout! (10 + 1 = 11 lids)
            day7_str = (base_date + timedelta(days=6)).strftime('%Y-%m-%d')
            res7 = process_gameplay_log(db, user_id, date_override=day7_str, round_num=11)
            self.assertEqual(res7['current_streak'], 7)
            self.assertTrue(res7['retroactive_payout'])
            self.assertEqual(res7['lids_awarded'], 11)
            self.assertEqual(res7['total_lids'], 11)
            self.assertEqual(res7['streak_qualified'], 1)

            # Day 7: Game 2 is played -> ongoing 1 Lid
            res7_b = process_gameplay_log(db, user_id, date_override=day7_str, round_num=12)
            self.assertEqual(res7_b['current_streak'], 7)
            self.assertFalse(res7_b['retroactive_payout'])
            self.assertEqual(res7_b['lids_awarded'], 1)
            self.assertEqual(res7_b['total_lids'], 12)

            # Day 8: Ongoing payout (1 Lid)
            day8_str = (base_date + timedelta(days=7)).strftime('%Y-%m-%d')
            res8 = process_gameplay_log(db, user_id, date_override=day8_str, round_num=13)
            self.assertEqual(res8['current_streak'], 8)
            self.assertEqual(res8['lids_awarded'], 1)
            self.assertEqual(res8['total_lids'], 13)

            # Streak Reset: User skips Day 9 and plays on Day 10
            day10_str = (base_date + timedelta(days=9)).strftime('%Y-%m-%d')
            res10 = process_gameplay_log(db, user_id, date_override=day10_str, round_num=14)
            self.assertEqual(res10['current_streak'], 1)
            self.assertEqual(res10['streak_qualified'], 0)
            self.assertEqual(res10['lids_awarded'], 0)
            self.assertEqual(res10['total_lids'], 13)

    def test_law_enforcement_dispatch_formula_comprehensive(self):
        with app.app_context():
            user_id = self.create_test_user('bm_formula_tester')
            headers = self.get_auth_headers(user_id, 'bm_formula_tester')
            db = get_db()

            # Set user with 500 Lids
            db.execute('UPDATE users SET lids = 500, balance = 0 WHERE id = ?', (user_id,))
            db.execute('INSERT OR REPLACE INTO inventory (user_id, item_name, quantity) VALUES (?, "Lids", 500)', (user_id,))
            db.commit()

            # Test every threshold from 1 to 50
            cases = [
                (1, 0), (5, 0), (9, 0), (10, 0), # <= 10 -> 0 officers (Safe)
                (11, 1), (15, 1), (19, 1),       # 11-19 -> 1 officer
                (20, 2), (25, 2), (29, 2),       # 20-29 -> 2 officers
                (30, 3), (35, 3), (39, 3),       # 30-39 -> 3 officers
                (40, 4), (49, 4),                # 40-49 -> 4 officers
                (50, 5),                         # 50-59 -> 5 officers
                (100, 10)                        # 100 -> 10 officers
            ]

            for count, expected_cops in cases:
                db.execute('UPDATE users SET lids = 500 WHERE id = ?', (user_id,))
                db.commit()

                res = self.app.post('/api/game/black-market/sell-lids', headers=headers, json={'count': count})
                data = res.get_json()
                self.assertTrue(data['success'], f'Failed selling {count} lids: {data}')
                self.assertEqual(data['lids_sold'], count)
                self.assertEqual(data['officers_dispatched'], expected_cops, f'Mismatch for {count} lids sold: expected {expected_cops}, got {data["officers_dispatched"]}')
                self.assertEqual(data['cash_earned'], count * 250)

    def test_sync_and_profile_endpoints_streak_fields(self):
        with app.app_context():
            user_id = self.create_test_user('sync_streak_user')
            headers = self.get_auth_headers(user_id, 'sync_streak_user')
            db = get_db()
            db.execute('UPDATE users SET lids = 42, current_streak = 5, max_streak = 8, streak_qualified = 0, last_active_date = ? WHERE id = ?',
                       (datetime.utcnow().strftime('%Y-%m-%d'), user_id))
            db.commit()

            # Test /api/game/sync
            sync_res = self.app.get('/api/game/sync', headers=headers)
            s_data = sync_res.get_json()
            self.assertEqual(s_data['lids'], 42)
            self.assertEqual(s_data['current_streak'], 5)
            self.assertEqual(s_data['max_streak'], 8)
            self.assertEqual(s_data['streak_qualified'], 0)

            # Test /api/user/profile
            prof_res = self.app.get('/api/user/profile', headers=headers)
            p_data = prof_res.get_json()
            self.assertTrue(p_data['success'])
            prof = p_data['profile']
            self.assertEqual(prof['lids'], 42)
            self.assertEqual(prof['current_streak'], 5)
            self.assertEqual(prof['max_streak'], 8)

    def test_end_round_integration_logs_timestamp_and_streak(self):
        with app.app_context():
            user_id = self.create_test_user('round_streak_user')
            headers = self.get_auth_headers(user_id, 'round_streak_user')

            # Complete round 1 via /api/game/end-round
            res = self.app.post('/api/game/end-round', headers=headers, json={
                'earned': 500,
                'trash_collected': 15,
                'followers': 2
            })
            data = res.get_json()
            self.assertTrue(data['success'])
            self.assertEqual(data['current_streak'], 1)
            self.assertEqual(data['lids_awarded'], 0) # Day 1 is locked

            # Verify log in gameplay_logs
            db = get_db()
            cursor = db.cursor()
            cursor.execute('SELECT * FROM gameplay_logs WHERE user_id = ?', (user_id,))
            log = cursor.fetchone()
            self.assertIsNotNone(log)
            self.assertIsNotNone(log['played_at'])
            self.assertEqual(log['streak_day'], 1)
            self.assertEqual(log['lids_awarded'], 0)

if __name__ == '__main__':
    unittest.main()
