import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import PlaceDetailClient from '@/components/places/PlaceDetailClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('places').select('name, short_desc, cover_image').eq('id', params.id).single();
  const place = data as any;
  if (!place) return { title: 'Газар олдсонгүй' };
  return {
    title: place.name,
    description: place.short_desc ?? '',
    openGraph: { images: place.cover_image ? [place.cover_image] : [] },
  };
}

export default async function PlacePage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('places')
    .select('*, reviews(*, user:profiles(id, full_name))')
    .eq('id', params.id)
    .single();

  const place = data as any;
  if (!place) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let likedIds: string[] = [];
  let profile = null;
  if (user) {
    const [likesRes, profileRes] = await Promise.all([
      supabase.from('likes').select('place_id').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);
    likedIds = (likesRes.data ?? []).map((l: any) => l.place_id);
    profile = profileRes.data as any;
  }

//   await supabase.rpc(
//   'increment_view_count',
//   { place_id: params.id } as unknown as never
// );

await (supabase.rpc as any)(
  'increment_view_count',
  { place_id: params.id }
);

  return (
    <PlaceDetailClient
      place={place}
      initialLiked={likedIds.includes(place.id)}
      profile={profile}
    />
  );
}
