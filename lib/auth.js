export function checkBasicAuth(headers) {
  const auth = headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    return false;
  }

  try {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [username, password] = decoded.split(':');

    return (
      username === process.env.BASIC_AUTH_USER &&
      password === process.env.BASIC_AUTH_PASS
    );
  } catch {
    return false;
  }
}
