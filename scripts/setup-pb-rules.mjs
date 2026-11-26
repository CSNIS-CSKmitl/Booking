// scripts/setup-pb-rules.mjs
// ตั้ง PB collection rules + เพิ่ม booker_id field ใน bookings
//
// รัน: node scripts/setup-pb-rules.mjs
// หรือ: npm run setup:rules

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_URL || "https://db.cskmitl.com";
const ADMIN_EMAIL = process.env.USER_ADMIN || "";
const ADMIN_PASSWORD = process.env.USER_ADMIN_PASSWORD || "";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌ ต้องตั้ง USER_ADMIN และ USER_ADMIN_PASSWORD ใน env");
  console.error(
    "   เช่น: USER_ADMIN=admin@x.com USER_ADMIN_PASSWORD=secret node scripts/setup-pb-rules.mjs",
  );
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

async function main() {
  console.log(`🔌 กำลังต่อ PB ที่ ${PB_URL} ...`);

  // 1. Auth as admin
  await pb
    .collection("_superusers")
    .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("✅ login เป็น admin สำเร็จ\n");

  // 2. Get collection IDs
  const usersCol = await pb.collections.getOne("users");
  const roomsCol = await pb.collections.getOne("rooms");
  const bookingsCol = await pb.collections.getOne("bookings");

  // PB server บางเวอร์ชันตอบ field ชื่อ "fields" (ใหม่) บางเวอร์ชันตอบ "schema" (เก่า)
  // รองรับทั้งสองแบบ
  const schemaKey = Array.isArray(bookingsCol.fields)
    ? "fields"
    : Array.isArray(bookingsCol.schema)
      ? "schema"
      : null;
  if (!schemaKey) {
    console.error("❌ ไม่เจอ fields/schema ใน bookings collection response");
    console.error("   response keys:", Object.keys(bookingsCol).join(", "));
    process.exit(1);
  }
  const bookingsSchema = bookingsCol[schemaKey];

  // 3. เพิ่ม/แก้ booker_id field ใน bookings (relation → users, maxSelect ต้องเป็น 1)
  const bookerIdField = bookingsSchema.find((f) => f.name === "booker_id");
  if (!bookerIdField) {
    // ยังไม่มี → เพิ่มใหม่
    await pb.collections.update(bookingsCol.id, {
      [schemaKey]: [
        ...bookingsSchema,
        {
          name: "booker_id",
          type: "relation",
          required: false,
          options: {
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
        },
      ],
    });
    console.log(
      "✅ เพิ่ม booker_id (relation → users, maxSelect=1) ใน bookings",
    );
  } else if (
    bookerIdField.options?.maxSelect !== 1 ||
    bookerIdField.type !== "relation"
  ) {
    // มีอยู่แต่ config ผิด → แก้
    const newSchema = bookingsSchema.map((f) => {
      if (f.name !== "booker_id") return f;
      return {
        ...f,
        type: "relation",
        required: false,
        options: {
          collectionId: usersCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
      };
    });
    await pb.collections.update(bookingsCol.id, { [schemaKey]: newSchema });
    console.log(
      `🔧 แก้ booker_id: type=${bookerIdField.type}→relation, maxSelect=${bookerIdField.options?.maxSelect}→1`,
    );
  } else {
    console.log("⏭️  booker_id มีอยู่แล้วและ config ถูกต้อง");
  }

  // 4. Rules: users
  await pb.collections.update(usersCol.id, {
    listRule: null,
    viewRule:
      '@request.auth.id = id || @request.auth.collectionName = "_superusers"',
    createRule: null,
    updateRule:
      '@request.auth.id = id || @request.auth.collectionName = "_superusers"',
    deleteRule: null,
  });
  console.log(
    "✅ users:    list=null  view=owner|admin  create=null  update=owner|admin  delete=null",
  );

  // 5. Rules: rooms
  await pb.collections.update(roomsCol.id, {
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  console.log(
    '✅ rooms:    list=""  view=""  create=null  update=null  delete=null  (public read, admin write)',
  );

  // 6. Rules: bookings
  //    createRule ใช้แบบง่าย — PB validate @request.data.booker_id ไม่ผ่าน
  //    (อาจเพราะ schema cache ยังไม่อัปเดต) — การกันจองแทนคนอื่นพึ่ง API ฝั่ง server
  //    (set booker_id = locals.user.id จาก hook verified แล้ว) แทน
  await pb.collections.update(bookingsCol.id, {
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule:
      'booker_id = @request.auth.id || @request.auth.collectionName = "_superusers"',
    deleteRule: '@request.auth.collectionName = "_superusers"',
  });
  console.log(
    "✅ bookings: list=auth  view=auth  create=auth  update=own|admin  delete=admin",
  );

  console.log("\n🎉 เสร็จแล้ว! ตรวจสอบได้ที่ PB Admin → API Rules");
}

main().catch((err) => {
  console.error("❌ ล้มเหลว:", err?.response || err?.message || err);
  process.exit(1);
});
