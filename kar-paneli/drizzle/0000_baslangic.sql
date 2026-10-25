CREATE TABLE `ad_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` integer NOT NULL,
	`store_id` integer,
	`name` text,
	`currency` text,
	`timezone` text,
	`allowed` integer DEFAULT 0 NOT NULL,
	`last_checked_at` text
);
--> statement-breakpoint
CREATE TABLE `ad_entities` (
	`level` text NOT NULL,
	`id` text NOT NULL,
	`account_id` text NOT NULL,
	`parent_id` text,
	`name` text,
	`status` text,
	`effective_status` text,
	`created_time` text,
	`raw_json` text NOT NULL,
	PRIMARY KEY(`level`, `id`)
);
--> statement-breakpoint
CREATE TABLE `ad_insights_daily` (
	`level` text NOT NULL,
	`entity_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text,
	`campaign_id` text,
	`adset_id` text,
	`date` text NOT NULL,
	`spend` real DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`inline_link_clicks` integer DEFAULT 0 NOT NULL,
	`cpm` real,
	`ctr` real,
	`purchases` real,
	`purchase_value` real,
	`add_to_cart` real,
	`initiate_checkout` real,
	`actions_json` text,
	`action_values_json` text,
	`currency` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`level`, `entity_id`, `date`)
);
--> statement-breakpoint
CREATE INDEX `adi_date_idx` ON `ad_insights_daily` (`date`);--> statement-breakpoint
CREATE INDEX `adi_account_level_idx` ON `ad_insights_daily` (`account_id`,`level`);--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cost_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_code` text NOT NULL,
	`unit_cost` real,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`breakdown` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `cost_versions_model_idx` ON `cost_versions` (`model_code`);--> statement-breakpoint
CREATE TABLE `daily_pnl` (
	`date` text PRIMARY KEY NOT NULL,
	`gross` real NOT NULL,
	`discount` real NOT NULL,
	`shipping_charged` real NOT NULL,
	`revenue` real NOT NULL,
	`refunds` real NOT NULL,
	`net_revenue` real NOT NULL,
	`cogs` real NOT NULL,
	`shipping_cost` real NOT NULL,
	`commission` real NOT NULL,
	`kdv` real NOT NULL,
	`pre_ad_profit` real NOT NULL,
	`meta_spend` real NOT NULL,
	`meta_source` text NOT NULL,
	`other_marketing` real NOT NULL,
	`post_ad_profit` real NOT NULL,
	`fixed_company` real NOT NULL,
	`company_net` real NOT NULL,
	`fixed_personal` real NOT NULL,
	`take_home` real NOT NULL,
	`orders` integer NOT NULL,
	`capsules` integer NOT NULL,
	`couple_orders` integer NOT NULL,
	`new_customer_orders` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`model_code` text,
	`product_id` text,
	`variant_id` text,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_date_idx` ON `events` (`date`);--> statement-breakpoint
CREATE TABLE `fixed_costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`frequency` text NOT NULL,
	`spread_months` integer,
	`start_date` text NOT NULL,
	`end_date` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`date` text NOT NULL,
	`currency` text NOT NULL,
	`selling` real NOT NULL,
	`source_date` text NOT NULL,
	PRIMARY KEY(`date`, `currency`)
);
--> statement-breakpoint
CREATE TABLE `line_calc` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`line_id` text NOT NULL,
	`order_id` text NOT NULL,
	`date` text NOT NULL,
	`model_code` text,
	`units` real NOT NULL,
	`list_amount` real NOT NULL,
	`discount` real NOT NULL,
	`revenue` real NOT NULL,
	`cogs` real NOT NULL,
	`shipping_cost` real NOT NULL,
	`commission` real NOT NULL,
	`kdv` real NOT NULL,
	`refunded_units` real NOT NULL,
	`refund_amount` real NOT NULL,
	`refund_cogs_back` real NOT NULL,
	`refund_kdv_back` real NOT NULL,
	`refund_commission_back` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `line_calc_date_idx` ON `line_calc` (`date`);--> statement-breakpoint
CREATE INDEX `line_calc_model_idx` ON `line_calc` (`model_code`);--> statement-breakpoint
CREATE TABLE `marketing_shipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`model_code` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`person_note` text,
	`with_shipping` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `models` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`material` text,
	`active` integer DEFAULT 1 NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `order_calc` (
	`order_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`date` text NOT NULL,
	`included` integer NOT NULL,
	`exclude_reason` text,
	`dtc` integer NOT NULL,
	`gross` real NOT NULL,
	`discount` real NOT NULL,
	`shipping_charged` real NOT NULL,
	`revenue` real NOT NULL,
	`cogs` real NOT NULL,
	`shipping_cost` real NOT NULL,
	`commission` real NOT NULL,
	`commission_rate` real NOT NULL,
	`gateway` text,
	`gateway_known` integer NOT NULL,
	`kdv` real NOT NULL,
	`capsules` integer NOT NULL,
	`couple` integer NOT NULL,
	`physical` integer NOT NULL,
	`new_customer` integer NOT NULL,
	`unmatched_lines` integer NOT NULL,
	`missing_cost_units` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_calc_date_idx` ON `order_calc` (`date`);--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`title` text NOT NULL,
	`variant_title` text,
	`name` text,
	`sku` text,
	`quantity` integer NOT NULL,
	`original_unit_price` real NOT NULL,
	`discounted_total` real NOT NULL,
	`discount_allocated` real DEFAULT 0 NOT NULL,
	`product_id` text,
	`variant_id` text,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`processed_at` text,
	`updated_at` text NOT NULL,
	`cancelled_at` text,
	`test` integer DEFAULT 0 NOT NULL,
	`financial_status` text,
	`fulfillment_status` text,
	`currency` text,
	`total_price` real DEFAULT 0 NOT NULL,
	`current_total_price` real,
	`subtotal_price` real,
	`total_discounts` real,
	`total_shipping` real,
	`shipping_charged` real,
	`total_tax` real,
	`gateways` text,
	`discount_codes` text,
	`tags` text,
	`source_name` text,
	`customer_id` text,
	`customer_order_index` integer,
	`fulfillment_count` integer DEFAULT 0 NOT NULL,
	`first_fulfilled_at` text,
	`refunds_complete` integer DEFAULT 1 NOT NULL,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`variant_id` text NOT NULL,
	`product_id` text,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`price` real,
	`compare_at_price` real,
	PRIMARY KEY(`variant_id`, `date`, `source`)
);
--> statement-breakpoint
CREATE TABLE `product_map` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_type` text NOT NULL,
	`key_value` text NOT NULL,
	`label` text,
	`source` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_map_key_idx` ON `product_map` (`key_type`,`key_value`);--> statement-breakpoint
CREATE TABLE `product_map_components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` integer NOT NULL,
	`model_code` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pmc_map_idx` ON `product_map_components` (`map_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`handle` text,
	`status` text,
	`product_type` text,
	`created_at` text,
	`updated_at` text,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refund_calc` (
	`refund_id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`cogs_back` real NOT NULL,
	`kdv_back` real NOT NULL,
	`commission_back` real NOT NULL,
	`return_shipping` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refund_calc_date_idx` ON `refund_calc` (`date`);--> statement-breakpoint
CREATE TABLE `refund_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`refund_id` text NOT NULL,
	`order_id` text NOT NULL,
	`line_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`restock_type` text,
	`subtotal` real DEFAULT 0 NOT NULL,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refund_lines_refund_idx` ON `refund_lines` (`refund_id`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`created_at` text NOT NULL,
	`total_refunded` real NOT NULL,
	`shipping_refunded` real DEFAULT 0 NOT NULL,
	`lines_loaded` integer DEFAULT 0 NOT NULL,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`);--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`unit` text NOT NULL,
	`value` real NOT NULL,
	`scope` text,
	`note` text,
	`valid_from` text NOT NULL,
	`valid_to` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer NOT NULL,
	`domain` text NOT NULL,
	`name` text,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`timezone` text DEFAULT 'Europe/Istanbul' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_domain_unique` ON `stores` (`domain`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`kind` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`message` text,
	`rows` integer,
	`cursor` text
);
--> statement-breakpoint
CREATE INDEX `sync_log_source_idx` ON `sync_log` (`source`,`started_at`);--> statement-breakpoint
CREATE TABLE `tp_monthly` (
	`month` text PRIMARY KEY NOT NULL,
	`gross_sales` real,
	`discounts` real,
	`refunds` real,
	`revenue` real,
	`cogs` real,
	`shipping_costs` real,
	`shipping_charged` real,
	`transaction_fees` real,
	`taxes_collected` real,
	`ad_spend` real,
	`facebook_ad_spend` real,
	`net_profit` real
);
--> statement-breakpoint
CREATE TABLE `tp_orders` (
	`order_code` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`items` text,
	`revenue` real,
	`shipping_cost` real,
	`total_cogs` real,
	`transaction_fee` real,
	`gross_profit` real
);
--> statement-breakpoint
CREATE INDEX `tp_orders_date_idx` ON `tp_orders` (`date`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text,
	`status` text,
	`gateway` text,
	`amount` real,
	`currency` text,
	`processed_at` text,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transactions_order_idx` ON `transactions` (`order_id`);--> statement-breakpoint
CREATE TABLE `validation_reference` (
	`month` text PRIMARY KEY NOT NULL,
	`orders` real,
	`capsules` real,
	`net_revenue` real,
	`cogs` real,
	`shipping` real,
	`commission` real,
	`kdv` real,
	`meta_spend` real,
	`post_ad_profit` real
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`title` text,
	`sku` text,
	`price` real,
	`compare_at_price` real,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `variants_product_idx` ON `variants` (`product_id`);