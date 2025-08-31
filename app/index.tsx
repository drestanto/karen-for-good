import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";

const LOCATION_TASK_NAME = "background-location-task";

// ------------------------------
// AREA DEFINITIONS
// ------------------------------

// AREA 1
export const AREA_1_BOXES = [
  { minLat: -37.8100, maxLat: -37.8080, minLon: 144.9500, maxLon: 144.9520 },
  { minLat: -37.8085, maxLat: -37.8075, minLon: 144.9510, maxLon: 144.9530 },
];
export const AREA_1_NOTIFICATION = {
  title: "You're here 1",
  body: "Lorem 1 ipsum blah",
};

// AREA 2
export const AREA_2_BOXES = [
  { minLat: -37.8070, maxLat: -37.8050, minLon: 144.9550, maxLon: 144.9570 },
  { minLat: -37.8065, maxLat: -37.8055, minLon: 144.9560, maxLon: 144.9580 },
];
export const AREA_2_NOTIFICATION = {
  title: "You're here 2",
  body: "Lorem 2 ipsum blah",
};

// AREA 3
export const AREA_3_BOXES = [
  { minLat: -37.8120, maxLat: -37.8110, minLon: 144.9520, maxLon: 144.9540 },
  { minLat: -37.8115, maxLat: -37.8105, minLon: 144.9530, maxLon: 144.9550 },
];
export const AREA_3_NOTIFICATION = {
  title: "You're here 3",
  body: "Lorem 3 ipsum blah",
};

// AREA 4
export const AREA_4_BOXES = [
  { minLat: -37.8080, maxLat: -37.8075, minLon: 144.9580, maxLon: 144.9590 },
];
export const AREA_4_NOTIFICATION = {
  title: "You're here 4",
  body: "Lorem 4 ipsum blah",
};

// AREA 5
export const AREA_5_BOXES = [
  { minLat: -37.8060, maxLat: -37.8055, minLon: 144.9600, maxLon: 144.9610 },
];
export const AREA_5_NOTIFICATION = {
  title: "You're here 5",
  body: "Lorem 5 ipsum blah",
};

// ------------------------------
// AREAS ARRAY
// ------------------------------
const AREAS = [
  { boxes: AREA_1_BOXES, notification: AREA_1_NOTIFICATION },
  { boxes: AREA_2_BOXES, notification: AREA_2_NOTIFICATION },
  { boxes: AREA_3_BOXES, notification: AREA_3_NOTIFICATION },
  { boxes: AREA_4_BOXES, notification: AREA_4_NOTIFICATION },
  { boxes: AREA_5_BOXES, notification: AREA_5_NOTIFICATION },
];

const hasNotifiedArr = new Array(AREAS.length).fill(false);

// ------------------------------
// MAIN COMPONENT
// ------------------------------
export default function Page() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let bgStatus = "granted";
      if (Platform.OS === "android") {
        const bg = await Location.requestBackgroundPermissionsAsync();
        bgStatus = bg.status;
      }

      const notifStatus = await Notifications.requestPermissionsAsync();

      if (status === "granted" && bgStatus === "granted" && notifStatus.granted) {
        setHasPermission(true);
        startBackgroundLocation();
      } else {
        setHasPermission(false);
        setErrorMsg("Permission denied!");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error requesting permissions");
    }
  };

  const startBackgroundLocation = async () => {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 20000, // 20 seconds
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: "Karen For Good",
          notificationBody: "Tracking your location in background",
          notificationColor: "#FF0000",
        },
        pausesUpdatesAutomatically: false,
      });
    } catch (error) {
      console.error("Failed to start background location:", error);
    }
  };

  // ------------------------------
  // Foreground real-time location
  // ------------------------------
  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const subscribe = async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 0 },
        (loc) => setLocation(loc)
      );
    };

    if (hasPermission) subscribe();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [hasPermission]);

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <>
          <Text style={styles.text}>Location tracking active:</Text>
          {location ? (
            <Text style={styles.text}>
              Lat: {location.coords.latitude.toFixed(6)}, Lon:{" "}
              {location.coords.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.text}>Getting location...</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.text}>
            Please give permission to location to activate the app
          </Text>
          <Button title="Give access to location" onPress={requestPermission} />
          {errorMsg && <Text style={{ color: "red" }}>{errorMsg}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 16 },
  text: { fontSize: 18, textAlign: "center", marginBottom: 16 },
});

// ------------------------------
// Background task
// ------------------------------
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  if (!data) return;

  const { locations } = data as any;
  const loc = locations[0];
  console.log(`Background location: Lat ${loc.coords.latitude}, Lon ${loc.coords.longitude}`);

  AREAS.forEach((area, i) => {
    const inside = area.boxes.some(
      (box) =>
        loc.coords.latitude >= box.minLat &&
        loc.coords.latitude <= box.maxLat &&
        loc.coords.longitude >= box.minLon &&
        loc.coords.longitude <= box.maxLon
    );

    if (inside && !hasNotifiedArr[i]) {
      Notifications.scheduleNotificationAsync({
        content: { title: area.notification.title, body: area.notification.body },
        trigger: null,
      });
      hasNotifiedArr[i] = true;
    } else if (!inside) {
      hasNotifiedArr[i] = false; // reset when leaving all boxes of the area
    }
  });
});
