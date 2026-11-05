import { MAX_SLOTS, readLocalSnapshot, writeLocalSnapshot } from './save-slots.js';
import { getSupabase } from './supabase.js';

function newerThan(left, right) {
  return new Date(left?.savedAt || 0).getTime() > new Date(right?.savedAt || 0).getTime();
}

export async function uploadCloudSave(userId, slotIndex, snapshot) {
  const supabase = await getSupabase();
  if (!supabase || !userId) return { offline: true };
  const { error } = await supabase.from('career_saves').upsert({
    user_id: userId,
    slot_index: slotIndex,
    snapshot,
    saved_at: snapshot.savedAt,
  }, { onConflict: 'user_id,slot_index' });
  if (error) throw error;
  return { offline: false };
}

export async function deleteCloudSave(userId, slotIndex) {
  const supabase = await getSupabase();
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('career_saves')
    .delete()
    .eq('user_id', userId)
    .eq('slot_index', slotIndex);
  if (error) throw error;
}

export async function synchronizeCloudSaves(userId) {
  const supabase = await getSupabase();
  if (!supabase || !userId) return { downloaded: 0, uploaded: 0 };
  const { data, error } = await supabase
    .from('career_saves')
    .select('slot_index,snapshot,saved_at')
    .order('slot_index');
  if (error) throw error;

  const remoteBySlot = new Map((data || []).map((row) => [row.slot_index, row]));
  let downloaded = 0;
  let uploaded = 0;
  for (let slotIndex = 0; slotIndex < MAX_SLOTS; slotIndex += 1) {
    const local = readLocalSnapshot(slotIndex);
    const remote = remoteBySlot.get(slotIndex)?.snapshot ?? null;
    if (remote && (!local || newerThan(remote, local))) {
      writeLocalSnapshot(slotIndex, remote);
      downloaded += 1;
    } else if (local && (!remote || newerThan(local, remote))) {
      await uploadCloudSave(userId, slotIndex, local);
      uploaded += 1;
    }
  }
  return { downloaded, uploaded };
}
