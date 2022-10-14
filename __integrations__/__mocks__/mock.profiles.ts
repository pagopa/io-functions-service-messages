import { ServicesPreferencesModeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicesPreferencesMode";
import { Profile } from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  EmailString,
  FiscalCode,
  Semver
} from "@pagopa/ts-commons/lib/strings";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { ReminderStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReminderStatus";
import { aFiscalCodeWithMessages } from "./mock.messages";

// ---------------------------------
// Profiles
// ---------------------------------

export const anAutoFiscalCodeWithReminderEnabled = aFiscalCodeWithMessages;
export const anAutoFiscalCodeWithReminderDisabled = "AAABBB01C02D345D" as FiscalCode;
export const anAutoFiscalCodeWithReminderNotDefined = "AAABBB01C02D345N" as FiscalCode;

const autoProfile: Profile = {
  acceptedTosVersion: 2,
  email: "fake-email@fake.it" as EmailString,
  fiscalCode: anAutoFiscalCodeWithReminderEnabled,
  isEmailEnabled: true,
  isEmailValidated: true,
  isInboxEnabled: true,
  isWebhookEnabled: true,
  blockedInboxOrChannels: {},
  servicePreferencesSettings: {
    mode: ServicesPreferencesModeEnum.AUTO,
    version: 1 as NonNegativeInteger
  },
  lastAppVersion: process.env.MIN_APP_VERSION_WITH_READ_AUTH as Semver
};

export const profiles = [
  {
    fiscalCode: anAutoFiscalCodeWithReminderEnabled,
    reminderStatus: ReminderStatusEnum.ENABLED
  },
  {
    fiscalCode: anAutoFiscalCodeWithReminderDisabled,
    reminderStatus: ReminderStatusEnum.DISABLED
  },
  {
    fiscalCode: anAutoFiscalCodeWithReminderNotDefined
  }
].map(data => ({ ...autoProfile, ...data }));
