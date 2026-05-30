-- ユーザープロフィール
create table if not exists profiles (
  id text primary key,
  email text unique not null,
  name text,
  password_hash text,
  created_at timestamptz default now()
);

-- チェックリストのカテゴリ
create table if not exists categories (
  id text primary key,
  user_id text references profiles(id) on delete cascade,
  icon text not null,
  name text not null,
  order_index int default 0,
  created_at timestamptz default now()
);

-- チェックリストのアイテム
create table if not exists items (
  id text primary key,
  category_id text references categories(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  label text not null,
  checked boolean default false,
  order_index int default 0,
  created_at timestamptz default now()
);

-- AIアドバイス履歴
create table if not exists ai_advice_history (
  id text primary key,
  user_id text references profiles(id) on delete cascade,
  situation text not null,
  advice text not null,
  created_at timestamptz default now()
);

-- インデックス
create index if not exists idx_categories_user_id on categories(user_id);
create index if not exists idx_items_user_id on items(user_id);
create index if not exists idx_items_category_id on items(category_id);
create index if not exists idx_ai_advice_history_user_id on ai_advice_history(user_id);
