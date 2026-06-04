/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SignalMode = 'SCHEDULE' | 'INTERVAL_3' | 'INTERVAL_5' | 'INTERVAL_10';

export interface SignalRequest {
  id: string;
  timestamp: string;
  signalTime: string;
  mode: SignalMode;
  status: 'READY' | 'FINISHED' | 'EXPIRED';
}

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  password?: string; // Opt out on list for security representation
  isApproved: boolean;
  role: 'user' | 'admin';
  registeredAt: string;
}

export const SIGNAL_SCHEDULE_TIMES = [
  "22:55:27", "23:13:46", "23:20:14", "23:23:21", "23:28:39", "23:31:54", "23:42:05", "23:45:23", "23:50:37",
  "00:01:17", "00:06:48", "00:09:10", "00:13:45", "00:18:12", "00:21:28", "00:24:46", "00:27:08", "00:30:14",
  "00:35:37", "00:46:26", "00:51:37", "00:54:19", "00:58:49", "01:03:17", "01:08:23", "01:11:43", "01:14:32",
  "01:19:21", "01:22:51", "01:26:34", "01:29:38", "01:34:21", "01:42:42", "01:44:18", "01:54:21", "02:00:27", "02:07:23"
];
