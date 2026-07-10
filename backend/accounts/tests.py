from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from accounts.models import User, Notification

class NotificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='Test',
            last_name='User',
            role='teacher'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='password123',
            first_name='Other',
            last_name='User',
            role='parent'
        )
        self.notification1 = Notification.objects.create(
            recipient=self.user,
            title='Test Notification 1',
            message='Message 1',
            category='general'
        )
        self.notification2 = Notification.objects.create(
            recipient=self.user,
            title='Test Notification 2',
            message='Message 2',
            category='finance'
        )
        self.other_notification = Notification.objects.create(
            recipient=self.other_user,
            title='Other Notification',
            message='Other Message',
            category='general'
        )

    def test_delete_notification(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('accounts:notification-detail', kwargs={'pk': self.notification1.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(id=self.notification1.id).exists())

    def test_delete_other_user_notification_forbidden(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('accounts:notification-detail', kwargs={'pk': self.other_notification.id})
        response = self.client.delete(url)
        # Should be 404 because the queryset is filtered to only include self.user's notifications
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Notification.objects.filter(id=self.other_notification.id).exists())

    def test_clear_all_notifications(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('accounts:notification-clear-all')
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that self.user's notifications are deleted, but other_user's remains
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 0)
        self.assertEqual(Notification.objects.filter(recipient=self.other_user).count(), 1)
