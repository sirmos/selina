import { Platform } from "react-native";
import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";

// Fill these in from your own RevenueCat project, do not commit real keys.
// See the .env.example file and the README setup steps.
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? "";
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? "";

export const ENTITLEMENT_ID = "selina_plus";

export function configureRevenueCat() {
  const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn(
      "RevenueCat API key is missing. Add EXPO_PUBLIC_RC_IOS_KEY and " +
        "EXPO_PUBLIC_RC_ANDROID_KEY to your .env file before testing purchases."
    );
    return;
  }

  Purchases.configure({ apiKey });
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(packageToBuy: any): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
  return customerInfo;
}

export async function hasSelinaPlus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
