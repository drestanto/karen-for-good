import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, StyleSheet, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";

const LOCATION_TASK_NAME = "background-location-task";

// ------------------------------
// AREA BOXES (static, editable in code)
// Catatan: Koordinat ini dipilih berdasarkan lokasi toko yang paling sering dikunjungi
// dan terletak di sekitar University of Melbourne atau area CBD yang berdekatan.

// 1. Supermarket
export const AREA_1_BOXES = [
  // Coles, Melbourne Central (sangat dekat dengan kampus)
  { minLat: -37.8105, maxLat: -37.8095, minLon: 144.9620, maxLon: 144.9630 },
  // Coles, Franklin St
  { minLat: -37.8070, maxLat: -37.8060, minLon: 144.9620, maxLon: 144.9630 },
  // Coles, Lygon St, Carlton
  { minLat: -37.8010, maxLat: -37.8000, minLon: 144.9660, maxLon: 144.9670 },

  // Woolworths, Swanston St (QV building)
  { minLat: -37.8115, maxLat: -37.8105, minLon: 144.9650, maxLon: 144.9660 },
  // Woolworths, Elizabeth St
  { minLat: -37.8130, maxLat: -37.8120, minLon: 144.9625, maxLon: 144.9635 },
  // Woolworths, Victoria St, Carlton
  { minLat: -37.8040, maxLat: -37.8030, minLon: 144.9670, maxLon: 144.9680 },

  // Aldi, Swanston St
  { minLat: -37.8170, maxLat: -37.8160, minLon: 144.9660, maxLon: 144.9670 },
  // Aldi, La Trobe St
  { minLat: -37.8100, maxLat: -37.8090, minLon: 144.9560, maxLon: 144.9570 },
];

// 2. Pasar (Regular Markets)
export const AREA_2_BOXES = [
  // Queen Victoria Market
  { minLat: -37.8090, maxLat: -37.8050, minLon: 144.9540, maxLon: 144.9590 },
  // South Melbourne Market
  { minLat: -37.8320, maxLat: -37.8300, minLon: 144.9570, maxLon: 144.9590 },
  // Footscray Market
  { minLat: -37.8020, maxLat: -37.8000, minLon: 144.8960, maxLon: 144.8980 },
  // Coburg Market
  { minLat: -37.7470, maxLat: -37.7450, minLon: 144.9640, maxLon: 144.9660 },
];

// 3. Toko Alat dan Perlengkapan Rumah
export const AREA_3_BOXES = [
  // Bunnings Warehouse, Carlton
  { minLat: -37.7970, maxLat: -37.7960, minLon: 144.9640, maxLon: 144.9650 },
  // Bunnings Warehouse, Port Melbourne
  { minLat: -37.8370, maxLat: -37.8350, minLon: 144.9280, maxLon: 144.9300 },

  // Officeworks, Russell St
  { minLat: -37.8140, maxLat: -37.8130, minLon: 144.9675, maxLon: 144.9685 },
  // Officeworks, La Trobe St
  { minLat: -37.8100, maxLat: -37.8090, minLon: 144.9580, maxLon: 144.9590 },
  
  // JB Hi-Fi, Elizabeth St
  { minLat: -37.8120, maxLat: -37.8110, minLon: 144.9610, maxLon: 144.9620 },
];

// 4. Makanan Cepat Saji (Fast Food)
export const AREA_4_BOXES = [
  // McDonald's, Swanston St
  { minLat: -37.8100, maxLat: -37.8090, minLon: 144.9630, maxLon: 144.9640 },
  // McDonald's, Bourke St
  { minLat: -37.8145, maxLat: -37.8135, minLon: 144.9635, maxLon: 144.9645 },

  // Hungry Jack's, Swanston St
  { minLat: -37.8160, maxLat: -37.8150, minLon: 144.9650, maxLon: 144.9660 },
  // Hungry Jack's, Elizabeth St
  { minLat: -37.8150, maxLat: -37.8140, minLon: 144.9615, maxLon: 144.9625 },

  // KFC, Swanston St
  { minLat: -37.8130, maxLat: -37.8120, minLon: 144.9655, maxLon: 144.9665 },
  // KFC, Elizabeth St
  { minLat: -37.8148, maxLat: -37.8138, minLon: 144.9628, maxLon: 144.9638 },

  // Domino's Pizza, Swanston St
  { minLat: -37.8130, maxLat: -37.8120, minLon: 144.9660, maxLon: 144.9670 },
  // Domino's Pizza, Lygon St
  { minLat: -37.8015, maxLat: -37.8005, minLon: 144.9640, maxLon: 144.9650 },
];

// 5. Pusat Perbelanjaan (Shopping Centre)
export const AREA_5_BOXES = [
  // Melbourne Central & Emporium (berdekatan dan terhubung)
  { minLat: -37.8110, maxLat: -37.8090, minLon: 144.9620, maxLon: 144.9640 },
  // Bourke Street Mall
  { minLat: -37.8150, maxLat: -37.8130, minLon: 144.9630, maxLon: 144.9650 },
  // DFO South Wharf
  { minLat: -37.8250, maxLat: -37.8230, minLon: 144.9520, maxLon: 144.9540 },
];

// Areas array
const AREAS = [
  { boxes: AREA_1_BOXES, id: 1 },
  { boxes: AREA_2_BOXES, id: 2 },
  { boxes: AREA_3_BOXES, id: 3 },
  { boxes: AREA_4_BOXES, id: 4 },
  { boxes: AREA_5_BOXES, id: 5 },
];

// ------------------------------
// Notifications storage
const AREAS_NOTIFICATIONS: Record<number, { title: string; body: string }[]> = {};
const hasNotifiedArr = new Array(AREAS.length).fill(false);

// ------------------------------
// Load CSV notifications
export const loadNotifications = async () => {
  try {
    const fileUri = FileSystem.bundleDirectory + "assets/data/notifications.csv";
    const fileString = await FileSystem.readAsStringAsync(fileUri);
    const results = Papa.parse(fileString, { header: true, delimiter: ";" });

    results.data.forEach((row: any) => {
      const areaId = parseInt(row.area_id, 10);
      if (!AREAS_NOTIFICATIONS[areaId]) AREAS_NOTIFICATIONS[areaId] = [];
      AREAS_NOTIFICATIONS[areaId].push({
        title: row.title,
        body: row.body,
      });
    });
  } catch (error) {
    console.error("Failed to load notifications CSV:", error);
  }
};

// ------------------------------
// MAIN COMPONENT
export default function Page() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentArea, setCurrentArea] = useState<string>("Outside all areas");
  const prevAreaRef = useRef<string>("Outside all areas");

  useEffect(() => {
    loadNotifications();
  }, []);

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

  // Foreground real-time location
  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const subscribe = async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 0 },
        async (loc) => {
          setLocation(loc);

          // Determine which area user is in
          let areaFound = "Outside all areas";
          let areaIdFound: number | null = null;

          AREAS.forEach((area) => {
            const inside = area.boxes.some(
              (box) =>
                loc.coords.latitude >= box.minLat &&
                loc.coords.latitude <= box.maxLat &&
                loc.coords.longitude >= box.minLon &&
                loc.coords.longitude <= box.maxLon
            );
            if (inside) {
              areaFound = `Inside Area ${area.id}`;
              areaIdFound = area.id;
            }
          });

          setCurrentArea(areaFound);

          // Fire debug notification if entering a new area
          if (areaFound !== prevAreaRef.current && areaIdFound !== null) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `DEBUG: Entered Area ${areaIdFound}`,
                body: "This is a test notification.\n\nConsume responsibly please",
              },
              trigger: null,
            });
          }

          prevAreaRef.current = areaFound;
        }
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
            <>
              <Text style={styles.text}>
                Lat: {location.coords.latitude.toFixed(6)}, Lon:{" "}
                {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.text}>{currentArea}</Text>
            </>
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
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;

  const { locations } = data as any;
  const loc = locations[0];

  AREAS.forEach((area, i) => {
    const inside = area.boxes.some(
      (box) =>
        loc.coords.latitude >= box.minLat &&
        loc.coords.latitude <= box.maxLat &&
        loc.coords.longitude >= box.minLon &&
        loc.coords.longitude <= box.maxLon
    );

    if (inside && !hasNotifiedArr[i]) {
      const notifications = AREAS_NOTIFICATIONS[area.id] || [];
      if (notifications.length > 0) {
        const randomIndex = Math.floor(Math.random() * notifications.length);
        const notif = notifications[randomIndex];
        Notifications.scheduleNotificationAsync({
          content: { 
            title: notif.title, 
            body: `${notif.body}\n\nConsume responsibly please` 
          },
          trigger: null,
        });
      }
      hasNotifiedArr[i] = true;
    } else if (!inside) {
      hasNotifiedArr[i] = false; // reset when leaving area
    }
  });
});
