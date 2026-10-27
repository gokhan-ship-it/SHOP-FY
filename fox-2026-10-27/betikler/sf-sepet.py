# SALT OKUMA (siparis yok): Storefront API ile sepet olustur, adres + (istege bagli) cark kodu ver,
# kargo seceneklerini ve indirim dagilimlarini oku. Kullanim: python3 sf-sepet.py <variant_id> [kod]
import json, sys, subprocess
v = sys.argv[1]; kod = sys.argv[2] if len(sys.argv) > 2 else None
q = """mutation($input: CartInput!) { cartCreate(input: $input) { cart { id
  cost { subtotalAmount { amount } totalAmount { amount } checkoutChargeAmount { amount } }
  lines(first: 5) { nodes { quantity cost { subtotalAmount { amount } totalAmount { amount } } merchandise { ... on ProductVariant { product { title } } } } }
  discountCodes { code applicable }
  discountAllocations { discountedAmount { amount } targetType ... on CartCodeDiscountAllocation { code } ... on CartAutomaticDiscountAllocation { title } }
  deliveryGroups(first: 5) { nodes { deliveryOptions { handle title code estimatedCost { amount } } selectedDeliveryOption { title estimatedCost { amount } } } }
} userErrors { field message code } warnings { code message } } }"""
inp = {"lines": [{"merchandiseId": "gid://shopify/ProductVariant/" + v, "quantity": 1}],
       "buyerIdentity": {"countryCode": "TR"},
       "delivery": {"addresses": [{"selected": True, "address": {"deliveryAddress": {"firstName": "Test", "lastName": "Kontrol", "address1": "Test Mahallesi 1", "city": "Kadikoy", "provinceCode": "TR-34", "zip": "34710", "countryCode": "TR"}}}]}}
if kod: inp["discountCodes"] = [kod]
body = json.dumps({"query": q, "variables": {"input": inp}})
r = subprocess.run(["curl", "-s", "-X", "POST", "https://texttonext.com/api/2025-07/graphql.json", "-H", "Content-Type: application/json", "--data-binary", "@-"], input=body, capture_output=True, text=True)
print(r.stdout)
