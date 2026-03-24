import * as jose from "jose";

if (!process.env.JWT_SECRET) {
	console.warn("WARNING: JWT_SECRET not set. Using insecure default for development only.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || crypto.randomUUID());
const JWT_ISSUER = "nexus-api";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash);
}

export async function createAccessToken(userId: string): Promise<string> {
	return new jose.SignJWT({ sub: userId, type: "access" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer(JWT_ISSUER)
		.setExpirationTime(ACCESS_TOKEN_EXPIRY)
		.sign(JWT_SECRET);
}

export async function createRefreshToken(userId: string): Promise<string> {
	return new jose.SignJWT({ sub: userId, type: "refresh" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer(JWT_ISSUER)
		.setExpirationTime(REFRESH_TOKEN_EXPIRY)
		.sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ sub: string; type: string }> {
	const { payload } = await jose.jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
	return { sub: payload.sub as string, type: payload.type as string };
}
