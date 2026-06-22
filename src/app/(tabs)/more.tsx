import { router } from 'expo-router';
import { List } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { t } from '@/i18n';

export default function MoreScreen() {
  return (
    <Screen>
      <List.Section>
        <List.Item
          title={t('budgets.title')}
          left={() => <List.Icon icon="chart-donut" />}
          onPress={() => router.push('/budgets')}
        />
        <List.Item
          title={t('goals.title')}
          left={() => <List.Icon icon="target" />}
          onPress={() => router.push('/goals')}
        />
        <List.Item
          title={t('fx.title')}
          left={() => <List.Icon icon="swap-horizontal" />}
          onPress={() => router.push('/fx-rates')}
        />
        <List.Item
          title={t('sms.title')}
          left={() => <List.Icon icon="message-text-outline" />}
          onPress={() => router.push('/sms')}
        />
        <List.Item
          title={t('settings.title')}
          left={() => <List.Icon icon="cog-outline" />}
          onPress={() => router.push('/settings')}
        />
      </List.Section>
    </Screen>
  );
}
